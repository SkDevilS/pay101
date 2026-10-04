"""
Indicpay Fusioncart Payment Gateway Integration Service
Handles payin transactions through Indicpay Fusioncart
"""

import requests
import json
import base64
import os
import time
import uuid
from datetime import datetime
from config import Config
from database import get_db_connection
from Crypto.Cipher import AES
from Crypto.Util.Padding import pad

class IndicpayFusioncartService:
    def __init__(self):
        self.base_url = getattr(Config, 'INDICPAY_FUSIONCART_BASE_URL', os.getenv('INDICPAY_FUSIONCART_BASE_URL', 'https://api.indicpay.in'))
        self.merchant_id = getattr(Config, 'INDICPAY_FUSIONCART_MERCHANT_ID', os.getenv('INDICPAY_FUSIONCART_MERCHANT_ID'))
        self.secret_key = getattr(Config, 'INDICPAY_FUSIONCART_SECRET_KEY', os.getenv('INDICPAY_FUSIONCART_SECRET_KEY'))
        self.encryption_key = getattr(Config, 'INDICPAY_FUSIONCART_ENCRYPTION_KEY', os.getenv('INDICPAY_FUSIONCART_ENCRYPTION_KEY'))
        self.encryption_iv = getattr(Config, 'INDICPAY_FUSIONCART_ENCRYPTION_IV', os.getenv('INDICPAY_FUSIONCART_ENCRYPTION_IV'))
    
    def _generate_auth_token(self):
        """Generate authentication token via AES encryption"""
        try:
            payload = json.dumps({
                "timestamp": int(time.time()),
                "secret": self.secret_key,
                "reqId": str(uuid.uuid4()),
            })

            key = self.encryption_key[:32].encode("utf-8")
            iv = self.encryption_iv.encode("utf-8")

            cipher = AES.new(key, AES.MODE_CBC, iv)
            encrypted = cipher.encrypt(pad(payload.encode("utf-8"), AES.block_size))

            return base64.b64encode(encrypted).decode("utf-8")
        except Exception as e:
            print(f"Indicpay Fusioncart generate token error: {e}")
            return None
            
    def _get_headers(self):
        """Get request headers with token and keys"""
        token = self._generate_auth_token()
        if not token:
            raise Exception("Failed to generate auth token")
                
        return {
            'Authorization': f'Bearer {token}',
            'merchant-id': self.merchant_id,
            'Content-Type': 'application/json'
        }

    def generate_txn_id(self, merchant_id, order_id):
        """Generate unique transaction ID with IND_FC_ prefix"""
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        import random
        random_suffix = random.randint(1000, 9999)
        return f"IND_FC_{timestamp}{random_suffix}"

    def calculate_charges(self, amount, scheme_id, service_type='PAYIN'):
        """Calculate charges based on scheme"""
        try:
            conn = get_db_connection()
            if not conn:
                return None, None, None
            
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT charge_value, charge_type
                    FROM commercial_charges
                    WHERE scheme_id = %s 
                    AND service_type = %s
                    AND %s BETWEEN min_amount AND max_amount
                    ORDER BY min_amount DESC
                    LIMIT 1
                """, (scheme_id, service_type, amount))
                
                charge_config = cursor.fetchone()
                
                if not charge_config:
                    return 0.00, amount, 'FIXED'
                
                charge_type = charge_config['charge_type']
                charge_value = float(charge_config['charge_value'])
                
                if charge_type == 'PERCENTAGE':
                    charge_amount = (amount * charge_value) / 100
                else:
                    charge_amount = charge_value
                
                net_amount = amount - charge_amount
                
                return round(charge_amount, 2), round(net_amount, 2), charge_type
                
        except Exception as e:
            print(f"Calculate charges error: {e}")
            return None, None, None
        finally:
            if conn:
                conn.close()

    def create_payin_order(self, merchant_id, order_data):
        """
        Create payin order via Indicpay Fusioncart
        """
        try:
            conn = get_db_connection()
            if not conn:
                return {'success': False, 'message': 'Database connection failed'}
            
            with conn.cursor() as cursor:
                cursor.execute("""
                    SELECT merchant_id, full_name, email, scheme_id, is_active
                    FROM merchants
                    WHERE merchant_id = %s
                """, (merchant_id,))
                
                merchant = cursor.fetchone()
                
                if not merchant:
                    return {'success': False, 'message': 'Merchant not found'}
                
                if not merchant['is_active']:
                    return {'success': False, 'message': 'Merchant account is inactive'}
                
                amount = float(order_data.get('amount', 0))
                if amount <= 0:
                    return {'success': False, 'message': 'Invalid amount'}
                
                charge_amount, net_amount, charge_type = self.calculate_charges(
                    amount, merchant['scheme_id']
                )
                
                if charge_amount is None:
                    return {'success': False, 'message': 'Failed to calculate charges'}
                
                original_orderid = order_data.get('orderid')
                txn_id = self.generate_txn_id(merchant_id, original_orderid)
                
                # Callback URL for Indicpay Fusioncart
                base_url_server = os.getenv('BACKEND_URL', 'https://api.pay101.uk')
                # But webhook should be set manually on their dashboard probably, but we can pass return URLs. 
                # According to docs return_urls are required.
                return_url = order_data.get('return_url', f"{base_url_server}/payin/callback/indicpay_fusioncart")
                
                # Payload construction
                payload_dict = {
                    "order_id": txn_id,
                    "bank_id": 1,
                    "amount": f"{amount:.2f}",
                    "currency": "INR",
                    "customer": {
                        "name": f"{order_data.get('payee_fname', '')} {order_data.get('payee_lname', '')}".strip() or "User",
                        "email": order_data.get('payee_email', 'user@example.com'),
                        "phone": order_data.get('payee_mobile', '9999999999')
                    },
                    "location": {
                        "ip": "127.0.0.1",
                        "city": "Unknown",
                        "state": "Unknown",
                        "country": "IN",
                        "pincode": "000000",
                        "latitude": "0.0000",
                        "longitude": "0.0000"
                    },
                    "device": {
                        "browser": "Chrome",
                        "os": "Unknown",
                        "ip_address": "127.0.0.1",
                        "mac": "00:00:00:00:00:00",
                        "imei": "000000000000000"
                    },
                    "return_urls": {
                        "success": return_url,
                        "failed": return_url,
                        "failure": return_url,
                        "cancel": return_url
                    },
                    "remarks": order_data.get('productinfo', 'Payment'),
                    "metadata": {
                        "udf1": original_orderid or "",
                        "udf2": merchant_id or "",
                        "udf3": ""
                    }
                }
                
                try:
                    headers = self._get_headers()
                except Exception as e:
                    return {'success': False, 'message': str(e)}
                
                url = f"{self.base_url}/api/v1/orders/create"
                
                print(f"Creating Indicpay Fusioncart order for {txn_id}...")
                
                response = requests.post(
                    url,
                    headers=headers,
                    json=payload_dict,
                    timeout=30
                )
                
                if response.status_code not in [200, 201]:
                    error_msg = f'Indicpay Fusioncart API error: {response.status_code} - {response.text}'
                    print(error_msg)
                    return {'success': False, 'message': f'API Error: {response.status_code} - {response.text}'}
                
                try:
                    gateway_response = response.json()
                except Exception as e:
                    print(f"Failed to decode API response: {e}. Raw response: {response.text}")
                    return {'success': False, 'message': 'Failed to decode API response'}
                    
                response_data = gateway_response.get('data', {})
                checkout_url = response_data.get('checkout', {}).get('url', '')
                intent_url = response_data.get('checkout', {}).get('intent', '')
                
                if not checkout_url and not intent_url:
                    error_msg = gateway_response.get('message', 'Order creation failed')
                    return {'success': False, 'message': error_msg}
                
                # Insert transaction record
                cursor.execute("""
                    INSERT INTO payin_transactions (
                        txn_id, merchant_id, order_id, amount, charge_amount, 
                        charge_type, net_amount, payee_name, payee_email, 
                        payee_mobile, product_info, status, pg_partner,
                        callback_url, created_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW()
                    )
                """, (
                    txn_id, merchant_id, original_orderid, amount, 
                    charge_amount, charge_type, net_amount,
                    payload_dict['customer']['name'], 
                    payload_dict['customer']['email'], 
                    payload_dict['customer']['mobile'], 
                    payload_dict['remarks'],
                    'INITIATED', 'INDICPAY_FUSIONCART',
                    order_data.get('callbackurl', '')
                ))
                
                conn.commit()
                
                return {
                    'success': True,
                    'txn_id': txn_id,
                    'order_id': original_orderid,
                    'amount': amount,
                    'charge_amount': charge_amount,
                    'net_amount': net_amount,
                    'qr_string': intent_url,
                    'upi_link': intent_url,
                    'payment_link': checkout_url or intent_url,
                    'intent_url': intent_url
                }
                
        except Exception as e:
            print(f"Create Indicpay Fusioncart payin order error: {e}")
            return {'success': False, 'message': f'Internal error: {str(e)}'}
        finally:
            if conn:
                conn.close()

    def check_payment_status(self, order_id):
        """Check status of a transaction with the gateway"""
        try:
            url = f"{self.base_url}/api/v1/order/search"
            headers = self._get_headers()
            
            payload = {
                "order_id": order_id
            }
            
            response = requests.post(url, headers=headers, json=payload, timeout=30)
            
            if response.status_code == 200:
                json_response = response.json()
                
                # Extract relevant fields
                tx_data = json_response.get('data', {}).get('transaction', {})
                if not tx_data:
                    tx_data = json_response.get('transaction', {})
                if not tx_data:
                    tx_data = json_response
                    
                status = tx_data.get('status', json_response.get('status', 'PENDING'))
                utr = tx_data.get('utr', tx_data.get('rrn', ''))
                txn_id = tx_data.get('id', tx_data.get('txnid', ''))
                
                # Map to standard statuses
                status_map = {
                    'Success': 'SUCCESS',
                    'Failed': 'FAILED',
                    'Pending': 'PENDING',
                    'Initiate': 'INITIATED'
                }
                
                mapped_status = status_map.get(status, 'PENDING')
                
                return {
                    'success': True,
                    'status': mapped_status,
                    'utr': utr,
                    'txnId': txn_id
                }
                
            return {'success': False, 'message': f"API Error: {response.status_code}"}
            
        except Exception as e:
            return {'success': False, 'message': f"Error: {str(e)}"}

indicpay_fusioncart_service = IndicpayFusioncartService()
