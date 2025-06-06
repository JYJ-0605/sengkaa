from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from api.models import Star
from api.serializers.star_serializer import StarSerializer

@api_view(['GET'])
@permission_classes([AllowAny])
def get_star_list(request):
    genre = request.query_params.get('genre')  # 예: ?genre=1 또는 ?genre=idol
    if genre:
        try:
            # 숫자로 들어온 경우 (id 기반 필터링)
            genre_id = int(genre)
            stars = Star.objects.filter(genre_id=genre_id)
        except ValueError:
            # 문자열로 들어온 경우 (장르 이름 기반 필터링)
            stars = Star.objects.filter(genre__name=genre)
    else:
        stars = Star.objects.all()

    serializer = StarSerializer(stars, many=True)
    return Response(serializer.data)
