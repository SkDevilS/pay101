"""
Indicpay Fusioncart Callback Routes
Handles webhook callbacks from Indicpay Fusioncart
"""

from flask import Blueprint, request, jsonify
from database import get_db_connection
from datetime import datetime
import json

# Webhook endpoint mapping to /payin/callback/indicpay_fusioncart
indicpay_fusioncart_callback_bp = Blueprint('indicpay_fusioncart_callback', __name__, url_prefix='/payin/callback')

@indicpay_fusioncart_callback_bp.route('/indicpay_fusioncart', methods=['POST'])
def indicpay_fusioncart_payin_callback():
    """
    Webhook endpoint for Indicpay Fusioncart payin status updates
    """
    try:
        print("=" * 80)
        print("Indicpay Fusioncart Payin Callback Received")
        print("=" * 80)
        
        callback_data = None
        if request.is_json:
            callback_data = request.json
        elif request.data:
            try:
                callback_data = json.loads(request.data.decode('utf-8'))
            except:
                pass
                
        if not callback_data:
            print("ERROR: No valid JSON data received")
            return jsonify({'success': False, 'message': 'Invalid data format'}), 400

        print(f"Callback Data: {json.dumps(callback_data, indent=2)}")

        # Extract data from callback
        tx_data = callback_data.get('data', {}).get('transaction', {})
        if not tx_data:
            tx_data = callback_data.get('transaction', {})
        if not tx_data:
            tx_data = callback_data

        status = tx_data.get('status', callback_data.get('status', ''))
        # client_id (our txn_id)
        client_id = tx_data.get('reference', tx_data.get('txnReference', tx_data.get('merchantTxnId', '')))
        # payid (Indicpay txn_id)
        payid = tx_data.get('id', tx_data.get('txnid', ''))
        # UTR
        operator_ref = tx_data.get('utr', tx_data.get('rrn', ''))

        if not client_id:
            print("ERROR: No merchantTxnId in callback")
            return jsonify({'success': False, 'message': 'Missing merchantTxnId'}), 400

        status_map = {
            'Success': 'SUCCESS',
            'Failed': 'FAILED',
            'Pending': 'PENDING',
            'Initiate': 'INITIATED'
        }
        
        mapped_status = status_map.get(status, 'PENDING')

        # Update database
        conn = get_db_connection()
        if not conn:
            return jsonify({'success': False, 'message': 'Database connection failed'}), 500

        try:
            with conn.cursor() as cursor:
                # Find transaction by txn_id (since we passed our txn_id as merchantTxnId)
                cursor.execute("""
                    SELECT txn_id, order_id, status, merchant_id, amount, net_amount, charge_amount, callback_url
                    FROM payin_transactions
                    WHERE txn_id = %s AND pg_partner = 'INDICPAY_FUSIONCART'
                """, (client_id,))

                txn = cursor.fetchone()
                
                # Also fallback to order_id in case it was passed there
                if not txn:
                    cursor.execute("""
                        SELECT txn_id, order_id, status, merchant_id, amount, net_amount, charge_amount, callback_url
                        FROM payin_transactions
                        WHERE order_id = %s AND pg_partner = 'INDICPAY_FUSIONCART'
                    """, (client_id,))
                    txn = cursor.fetchone()

                if not txn:
                    print(f"ERROR: Transaction not found for id: {client_id}")
                    return jsonify({'success': False, 'message': 'Transaction not found'}), 404

                print(f"Found Transaction: {txn['txn_id']}, Current Status: {txn['status']}")
                
                # Skip if already completed
                if txn['status'] in ['SUCCESS', 'FAILED']:
                    print(f"Transaction already in {txn['status']} state - skipping")
                    return jsonify({'success': True, 'message': 'Already processed'}), 200

                if mapped_status == 'SUCCESS':
                    cursor.execute("""
                        SELECT COUNT(*) as count FROM merchant_wallet_transactions
                        WHERE reference_id = %s AND txn_type = 'UNSETTLED_CREDIT'
                    """, (txn['txn_id'],))

                    wallet_credit_exists = cursor.fetchone()['count'] > 0

                    if wallet_credit_exists:
                        print(f"⚠ Wallet already credited for this transaction - skipping wallet credit")
                        if txn['status'] != 'SUCCESS':
                            cursor.execute("""
                                UPDATE payin_transactions
                                SET status = %s, bank_ref_no = %s, pg_txn_id = %s, completed_at = NOW(), updated_at = NOW()
                                WHERE txn_id = %s
                            """, (mapped_status, operator_ref, payid, txn['txn_id']))
                            conn.commit()
                    else:
                        print(f"Processing SUCCESS callback - crediting unsettled wallet")

                        cursor.execute("""
                            UPDATE payin_transactions
                            SET status = %s, pg_txn_id = %s, bank_ref_no = %s, completed_at = NOW(), updated_at = NOW()
                            WHERE txn_id = %s
                        """, (mapped_status, payid, operator_ref, txn['txn_id']))

                        net_amount = float(txn['net_amount'])
                        charge_amount = float(txn['charge_amount'])

                        # Merchant Wallet
                        cursor.execute("""
                            SELECT unsettled_balance FROM merchant_wallet WHERE merchant_id = %s
                        """, (txn['merchant_id'],))
                        wallet_result = cursor.fetchone()

                        if wallet_result:
                            unsettled_before = float(wallet_result['unsettled_balance'])
                            unsettled_after = unsettled_before + net_amount
                            cursor.execute("""
                                UPDATE merchant_wallet
                                SET unsettled_balance = %s, last_updated = NOW()
                                WHERE merchant_id = %s
                            """, (unsettled_after, txn['merchant_id']))
                        else:
                            cursor.execute("""
                                INSERT INTO merchant_wallet (merchant_id, balance, settled_balance, unsettled_balance)
                                VALUES (%s, 0.00, 0.00, %s)
                            """, (txn['merchant_id'], net_amount))
                            unsettled_before = 0.00
                            unsettled_after = net_amount

                        from wallet_service import wallet_service
                        wallet_txn_id = wallet_service.generate_txn_id('MWT')

                        cursor.execute("""
                            INSERT INTO merchant_wallet_transactions
                            (merchant_id, txn_id, txn_type, amount, balance_before, balance_after, description, reference_id)
                            VALUES (%s, %s, 'UNSETTLED_CREDIT', %s, %s, %s, %s, %s)
                        """, (
                            txn['merchant_id'], wallet_txn_id, net_amount, unsettled_before, unsettled_after,
                            f"Indicpay Fusioncart Payin credited to unsettled wallet - {client_id}", txn['txn_id']
                        ))

                        # Admin Wallet
                        cursor.execute("""
                            SELECT unsettled_balance FROM admin_wallet WHERE admin_id = 'admin'
                        """, ())
                        admin_wallet_result = cursor.fetchone()

                        if admin_wallet_result:
                            admin_unsettled_before = float(admin_wallet_result['unsettled_balance'])
                            admin_unsettled_after = admin_unsettled_before + charge_amount
                            cursor.execute("""
                                UPDATE admin_wallet
                                SET unsettled_balance = %s, last_updated = NOW()
                                WHERE admin_id = 'admin'
                            """, (admin_unsettled_after,))
                        else:
                            cursor.execute("""
                                INSERT IGNORE INTO admin_users (admin_id, password_hash, is_active)
                                VALUES ('admin', 'system_auto', FALSE)
                            """)
                            cursor.execute("""
                                INSERT INTO admin_wallet (admin_id, main_balance, unsettled_balance)
                                VALUES ('admin', 0.00, %s)
                            """, (charge_amount,))
                            admin_unsettled_before = 0.00
                            admin_unsettled_after = charge_amount

                        admin_wallet_txn_id = wallet_service.generate_txn_id('AWT')
                        cursor.execute("""
                            INSERT INTO admin_wallet_transactions
                            (admin_id, txn_id, txn_type, amount, balance_before, balance_after, description, reference_id)
                            VALUES (%s, %s, 'UNSETTLED_CREDIT', %s, %s, %s, %s, %s)
                        """, (
                            'admin', admin_wallet_txn_id, charge_amount, admin_unsettled_before, admin_unsettled_after,
                            f"Indicpay Fusioncart Payin charge - {client_id}", txn['txn_id']
                        ))

                        conn.commit()
                        print(f"✓ Transaction updated to SUCCESS and wallets credited")

                elif mapped_status == 'FAILED':
                    cursor.execute("""
                        UPDATE payin_transactions
                        SET status = %s, pg_txn_id = %s, completed_at = NOW(), updated_at = NOW()
                        WHERE txn_id = %s
                    """, (mapped_status, payid, txn['txn_id']))
                    conn.commit()
                    print(f"✓ Transaction updated to FAILED")
                else:
                    cursor.execute("""
                        UPDATE payin_transactions
                        SET status = %s, pg_txn_id = %s, updated_at = NOW()
                        WHERE txn_id = %s
                    """, (mapped_status, payid, txn['txn_id']))
                    conn.commit()

                # Merchant Callback Forwarding
                callback_url = txn.get('callback_url')
                if not callback_url:
                    cursor.execute("""
                        SELECT payin_callback_url FROM merchant_callbacks WHERE merchant_id = %s
                    """, (txn['merchant_id'],))
                    merchant_callback_fallback = cursor.fetchone()
                    if merchant_callback_fallback and merchant_callback_fallback.get('payin_callback_url'):
                        callback_url = merchant_callback_fallback['payin_callback_url'].strip()

                if callback_url:
                    if 'api.pay101.uk' in callback_url:
                        print(f"⚠ Skipping callback forward - merchant callback URL is our own callback endpoint")
                    else:
                        import requests
                        merchant_callback_data = {
                            'txn_id': txn['txn_id'],
                            'order_id': txn['order_id'],
                            'status': mapped_status,
                            'amount': str(txn['amount']),
                            'net_amount': str(txn['net_amount']),
                            'charge_amount': str(txn['charge_amount']),
                            'utr': operator_ref or '',
                            'pg_txn_id': payid or '',
                            'payment_mode': 'UPI',
                            'pg_partner': 'INDICPAY_FUSIONCART',
                            'timestamp': datetime.now().isoformat()
                        }
                        try:
                            callback_response = requests.post(
                                callback_url, json=merchant_callback_data,
                                headers={'Content-Type': 'application/json'}, timeout=10
                            )
                            cursor.execute("""
                                INSERT INTO callback_logs 
                                (merchant_id, txn_id, callback_url, request_data, response_code, response_data, created_at)
                                VALUES (%s, %s, %s, %s, %s, %s, NOW())
                            """, (
                                txn['merchant_id'], txn['txn_id'], callback_url,
                                json.dumps(merchant_callback_data), callback_response.status_code, callback_response.text[:1000]
                            ))
                            conn.commit()
                        except Exception as e:
                            print(f"ERROR: Failed to send merchant callback: {e}")
                            cursor.execute("""
                                INSERT INTO callback_logs 
                                (merchant_id, txn_id, callback_url, request_data, response_code, response_data, created_at)
                                VALUES (%s, %s, %s, %s, %s, %s, NOW())
                            """, (
                                txn['merchant_id'], txn['txn_id'], callback_url,
                                json.dumps(merchant_callback_data), 0, str(e)[:1000]
                            ))
                            conn.commit()

                return jsonify({'success': True, 'message': 'Callback processed successfully'}), 200

        finally:
            conn.close()

    except Exception as e:
        print(f"ERROR in callback: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': 'Failed to process callback data.'}), 500
