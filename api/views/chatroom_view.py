from rest_framework.decorators import api_view
from api.serializers.chatroom_serializer import ChatRoomSerializer, MessageSerializer
from api.models import ChatRoom, User, ChatRoomInvite, Notification
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.decorators import permission_classes
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404

User = get_user_model()

# views.py
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_chat_room(request):
    serializer = ChatRoomSerializer(data=request.data, context={"request": request})
    if serializer.is_valid():
        room = serializer.save()

        # ✅ 알림 보내기 (본인 제외 참여자에게만)
        for user in room.participants.exclude(pk=request.user.pk):
            Notification.objects.create(
                user=user,
                message=f"{request.user.nickname}님이 '{room.name}' 채팅방에 초대했어요."
            )

        return Response(ChatRoomSerializer(room).data, status=201)
    return Response(serializer.errors, status=400)

@api_view(['GET'])
def list_chat_rooms(request):
    q = request.GET.get('q', '')
    rooms = ChatRoom.objects.filter(name__icontains=q)
    serializer = ChatRoomSerializer(rooms, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def invite_user_to_room(request, room_id):
    nickname = request.data.get('nickname')
    if not nickname:
        return Response({"error": "닉네임이 누락되었습니다."}, status=400)

    room = get_object_or_404(ChatRoom, id=room_id)

    if request.user.nickname == nickname:
        return Response({"error": "자기 자신을 초대할 수 없습니다."}, status=400)

    try:
        invitee = User.objects.get(nickname=nickname)
    except User.DoesNotExist:
        return Response({"error": "해당 닉네임의 유저가 존재하지 않습니다."}, status=404)

    if room.participants.filter(user_id=invitee.id).exists():
        return Response({"error": "이미 해당 유저는 채팅방에 참여 중입니다."}, status=400)

    if ChatRoomInvite.objects.filter(room=room, invitee=invitee).exists():
        return Response({"error": "이미 초대한 유저입니다."}, status=400)
    
    if room.participants.count() >= room.max_participants:
        return Response({"error": "채팅방 최대 인원에 도달했어요."}, status=400)

    ChatRoomInvite.objects.create(room=room, inviter=request.user, invitee=invitee)

    # ✉️ 알림 생성
    Notification.objects.create(
        user=invitee,
        message=f"{request.user.nickname}가 '{room.name}' 채팅방에 초대했어요."
    )

    return Response({"detail": f"{invitee.nickname}님을 초대했습니다! 🎉"})

    

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def respond_to_invite(request, room_id):
    action = request.data.get('action')

    try:
        invite = ChatRoomInvite.objects.get(room__id=room_id, invitee=request.user)
    except ChatRoomInvite.DoesNotExist:
        return Response({"error": "초대가 존재하지 않아요."}, status=404)
    
    if invite.room.participants.count() >= invite.room.max_participants:
        return Response({"error": "채팅방 정원이 이미 가득 찼어요."}, status=400)

    if action == "accept":
        invite.room.participants.add(request.user)  # ✅ 방에 참가자로 추가
        invite.is_accepted = True
        invite.save()
        return Response({"detail": "채팅방에 입장했어요!"})

    elif action == "reject":
        invite.delete()
        return Response({"detail": "초대를 거절했어요."})

    else:
        return Response({"error": "action은 'accept' 또는 'reject'여야 해요."}, status=400)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def search_users(request):
    q = request.GET.get("q", "")
    users = User.objects.filter(nickname__icontains=q).exclude(user_id=request.user.id)[:10]
    return Response([
        {"user_id": u.user_id, "nickname": u.nickname}
        for u in users
    ])

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_chat_messages(request, room_id):
    room = get_object_or_404(ChatRoom, id=room_id)

    if not room.participants.filter(user_id=request.user.id).exists():
        return Response({"error": "채팅방에 참여하지 않았어요."}, status=403)

    messages = room.messages.order_by('timestamp')  # 최신순으로 바꾸려면 -timestamp
    serializer = MessageSerializer(messages, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_messages_as_read(request, room_id):
    room = get_object_or_404(ChatRoom, id=room_id)

    if not room.participants.filter(user_id=request.user.id).exists():
        return Response({"error": "참여 중인 채팅방이 아니에요."}, status=403)

    unread = room.messages.filter(is_read=False).exclude(sender=request.user)
    unread.update(is_read=True)
    return Response({"detail": f"{unread.count()}개의 메시지를 읽음 처리했어요."})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_chat_room_detail(request, room_id):
    room = get_object_or_404(ChatRoom, id=room_id)

    if not room.participants.filter(user_id=request.user.id).exists():
        return Response({"error": "채팅방에 참여하지 않았어요."}, status=403)

    serializer = ChatRoomSerializer(room)
    return Response(serializer.data)