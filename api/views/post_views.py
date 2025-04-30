from rest_framework import generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import NotFound
from api.models import Post, Reply
from rest_framework.views import APIView

from api.serializers.board_serializers import PostSerializer, ReplySerializer







# 📩 저장하기
class PostCreateView(generics.CreateAPIView):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user, is_approved=True)
        return Response(serializer.data, status=201)
    
# 📄 전체 목록 불러오기
class PostListView(generics.ListAPIView):
    serializer_class = PostSerializer

    def get_queryset(self):
        status = self.request.query_params.get('status')  # ?status=open
        queryset = Post.objects.all().order_by('-created_at')
        if status:
            queryset = queryset.filter(status=status)
        return queryset
    
    
# 모집중인 것만 불러오기
class OpenPostListView(generics.ListAPIView):
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Post.objects.filter(status='open').order_by('-created_at')

# 📄 모집완료 글 목록
class ClosedPostListView(generics.ListAPIView):
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Post.objects.filter(status='closed').order_by('-created_at')

# 게시글에 답글 기능
class ReplyCreateView(generics.CreateAPIView):
    serializer_class = ReplySerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        post_id = self.request.data.get("post")
        try:
            post = Post.objects.get(id=post_id)
        except Post.DoesNotExist:
            raise NotFound("해당 게시글이 존재하지 않습니다.")
        serializer.save(user=self.request.user, post=post)   
        
#답글 전체 보기 
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def reply_list_view(request, post_id):
    replies = Reply.objects.filter(post_id=post_id).order_by("created_at")
    serializer = ReplySerializer(replies, many=True)
    return Response(serializer.data)

#댓글 삭제
class ReplyDeleteView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        try:
            reply = Reply.objects.get(pk=pk)

            # 본인 댓글만 삭제 가능하게 체크
            if reply.user != request.user:
                return Response({'detail': '권한이 없습니다.'}, status=status.HTTP_403_FORBIDDEN)

            reply.delete()
            return Response({'detail': '댓글 삭제 완료'}, status=status.HTTP_204_NO_CONTENT)
        except Reply.DoesNotExist:
            return Response({'detail': '댓글이 존재하지 않습니다.'}, status=status.HTTP_404_NOT_FOUND)
