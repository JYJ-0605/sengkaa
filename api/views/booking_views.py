from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from api.serializers.booking_serializer import MyBookedVenueSerializer
from api.models import Booking, Venue
import base64
from datetime import datetime, timedelta
import requests
from rest_framework.permissions import AllowAny
from django.conf import settings
from uuid import uuid4

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_booked_venues(request):
    my_bookings = Booking.objects.filter(user=request.user, is_paid=True)
    serializer = MyBookedVenueSerializer(my_bookings, many=True, context={'request': request})
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([AllowAny])  # 필요 시 AllowAny로 변경 가능
def reserved_dates(request, venue_id):
    bookings = Booking.objects.filter(
        venue_id=venue_id,
        is_paid=True
    ).values_list('available_date', flat=True)

    # 날짜 객체 → 문자열로 변환
    date_list = [d.isoformat() for d in bookings]

    return Response(date_list)



@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payment_request(request):
    user = request.user
    venue_id = request.data.get('venue_id')
    amount = request.data.get('amount')
    start_date = request.data.get("start_date")
    end_date = request.data.get("end_date")

    # 🧼 유효성 검사
    if not venue_id or not amount or not start_date or not end_date:
        return Response({'error': 'venue_id, amount, start_date, end_date는 필수입니다.'}, status=400)

    try:
        venue = Venue.objects.get(id=venue_id)
    except Venue.DoesNotExist:
        return Response({'error': '존재하지 않는 장소입니다.'}, status=404)

    # 날짜 반복 생성
    dates = []
    current = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")

    while current <= end:
        date_obj = current.date()
        # 중복 체크
        if Booking.objects.filter(venue=venue, available_date=date_obj, is_paid=True).exists():
            return Response({'error': f'{date_obj} 날짜는 이미 예약됨'}, status=400)
        dates.append(date_obj)
        current += timedelta(days=1)

    # 💡 주문 ID 생성
    order_id = f"venue-{venue.id}-user-{user.id}-{uuid4().hex[:8]}"

    # 🔁 order_id는 결제 검증 시도에서 다시 쓸 수 있도록 고유하게 만들기!
    return Response({
        "orderId": order_id,
        "clientKey": settings.TOSS_CLIENT_KEY,
        "amount": int(amount),
        "dates": [str(d) for d in dates]  # 필요하면 프론트에서 보여줄 수 있도록
    })



@api_view(['POST'])
@permission_classes([AllowAny])
def toss_payment_verify(request):
    paymentKey = request.data.get('paymentKey')
    orderId = request.data.get('orderId')
    amount = request.data.get('amount')
    dates = request.data.get('dates')  # ✅ 배열 형태로 예약 날짜 받기

    if not paymentKey or not orderId or not amount or not dates:
        return Response({'error': '필수 값 누락'}, status=400)

    url = 'https://api.tosspayments.com/v1/payments/confirm'
    auth_header = base64.b64encode(f"{settings.TOSS_SECRET_KEY}:".encode()).decode()
    headers = {
        'Authorization': f'Basic {auth_header}',
        'Content-Type': 'application/json'
    }
    payload = {
        'paymentKey': paymentKey,
        'orderId': orderId,
        'amount': int(amount)
    }

    res = requests.post(url, headers=headers, json=payload)
    if res.status_code != 200:
        return Response({'error': 'Toss 결제 검증 실패'}, status=400)

    # ✅ orderId에서 venue_id 추출
    try:
        _, venue_id, _, _, _ = orderId.split('-')
    except ValueError:
        return Response({'error': 'orderId 파싱 실패'}, status=400)

    try:
        venue = Venue.objects.get(id=venue_id)
    except Venue.DoesNotExist:
        return Response({'error': '존재하지 않는 장소입니다.'}, status=404)

    # ✅ 여러 날짜 예약 생성
    for d in dates:
        date_obj = datetime.strptime(d, "%Y-%m-%d").date()
        if Booking.objects.filter(venue=venue, available_date=date_obj, is_paid=True).exists():
            return Response({'error': f'{d}는 이미 예약됨'}, status=400)

        Booking.objects.create(
            venue=venue,
            user=request.user,
            available_date=date_obj,
            is_paid=True
        )

    return Response({'message': '예약 완료'})
