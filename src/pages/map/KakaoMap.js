import React, { useEffect, useState } from 'react';
import axiosInstance from '../../shared/api/axiosInstance';
import './KakaoMap.css';
const KakaoMap = () => {
  const [userLocation, setUserLocation] = useState({
    lat: 37.5665,
    lng: 126.978,
  });
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [isEmpty, setIsEmpty] = useState(false);

  const markerIcons = {
    general: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  };

  const getCategory = (place) => {
    const genre = place.genre;

    if (
      (genre.includes('아이돌') ||genre.includes('생일')) &&
      genre.includes('카페')
    ) {
      return 'idol';
    }
    if (genre.includes('대관') || genre.includes('개인')) {
      return 'rental';
    }
    if (genre.includes('유튜버')) {
      return 'youtuber';
    }
    if (genre.includes('게임')) {
      return 'game';
    }
    if (
      genre.includes('만화') ||
      genre.includes('애니') ||
      genre.includes('웹툰')
    ) {
      return 'comic';
    }
    return 'general';
  };

  const borderColors = {
    idol: '#FFD700',
    rental: '#32CD32',
    game: '#FF8C00',
    comic: '#DC143C',
    youtuber: '#1E90FF',
    general: '#ffffff',
  };

  // ✅ SDK 로드 및 지도 초기화
  useEffect(() => {
    const script = document.createElement('script');
    script.src = `//dapi.kakao.com/v2/maps/sdk.js?appkey=2a1d16dca2b187d288b52687ea868276&libraries=services&autoload=false`;
    script.async = true;
    document.head.appendChild(script);

    script.onload = () => {
      window.kakao.maps.load(() => {
        // ✅ 위치가 유효할 때만 지도 초기화
        if (userLocation.lat && userLocation.lng) {
          initMap();
        }
      });
    };
  }, [userLocation.lat, userLocation.lng]);

  // ✅ 사용자 위치 갱신
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('위치 정보를 가져오는 중 오류 발생:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    }
  }, []);

  // ✅ 마커 클릭 핸들러 전역 바인딩
  useEffect(() => {
    window.handleMarkerClick = (placeName) => {
      const ps = new window.kakao.maps.services.Places();
      ps.keywordSearch(placeName, (data, status) => {
        if (status === window.kakao.maps.services.Status.OK) {
          const found = data.find((p) => p.place_name === placeName);
          if (found) {
            setSelectedPlace({
              ...found,
              image:
                found.image ||
                'https://via.placeholder.com/400x200?text=No+Image',
            });
          }
        }
      });
    };
  }, []);
  const getImageUrl = (image) => {
    if (!image) return 'https://via.placeholder.com/400x200?text=No+Image';
  
    return image.startsWith('http')
      ? image
      : `https://eventcafe.site${image}`;
  };
  const fetchCafes = async (lat, lng, map) => {
    try {
      const response = await axiosInstance.get('/user/events/nearby/', {
        params: {
          lat,
          lng,
          radius: 5,
        },
      });

      const data = response.data;
      setIsEmpty(data.length === 0);
      if (data.length === 0) return;

      const bounds = new window.kakao.maps.LatLngBounds();

      data.forEach((place) => {
        const latlng = new window.kakao.maps.LatLng(
          place.latitude,
          place.longitude
        );
        bounds.extend(latlng); // 🔥 지도 경계에 포함
        displayMarker(
          {
            ...place,
            x: place.longitude,
            y: place.latitude,
            image_url: getImageUrl(place.image),
          },
          getCategory(place),
          map
        );
      });
    } catch (e) {
      console.error('이벤트 불러오기 실패', e);
    }
  };

  // ✅ 지도 초기화
  const initMap = () => {
    const { kakao } = window;
    if (!kakao || !kakao.maps) return;

    const container = document.getElementById('myMap');
    const options = {
      center: new kakao.maps.LatLng(userLocation.lat, userLocation.lng),
      level: 4,
    };

    const map = new kakao.maps.Map(container, options);

    const defaultMarkerImage = new kakao.maps.MarkerImage(
      markerIcons.general,
      new kakao.maps.Size(40, 40),
      { offset: new kakao.maps.Point(20, 40) }
    );

    new kakao.maps.Marker({
      position: new kakao.maps.LatLng(userLocation.lat, userLocation.lng),
      image: defaultMarkerImage,
      map,
    });

    // 🧠 idle 이벤트로 지도 움직임 감지
    kakao.maps.event.addListener(map, 'idle', () => {
      const center = map.getCenter();
      fetchCafes(center.getLat(), center.getLng(), map);
    });

    // ✅ 초기 마커 세팅
    fetchCafes(userLocation.lat, userLocation.lng, map);
  };

  // ✅ 마커 출력 함수 (initMap 바깥으로 분리)
  const displayMarker = (place, category, map) => {
    const imageUrl =
      place.image ||
      'https://via.placeholder.com/100x100.png?text=No+Image';
    const borderColor = borderColors[category] || '#ffffff';

    const content = `
      <div class="custom-marker" style="border-color: ${borderColor}" onclick="window.handleMarkerClick('${place.cafe_name.replace(
      /'/g,
      "\\'"
    )}')">
        <img src="${imageUrl}" alt="포스터" />
      </div>
    `;

    new window.kakao.maps.CustomOverlay({
      map: map,
      position: new window.kakao.maps.LatLng(place.y, place.x),
      content: content,
      yAnchor: 1,
    });
  };

  return (
    <div className="kakao-map-container">
      <div className={`info-panel ${selectedPlace ? '' : 'hidden'}`}>
        {selectedPlace && (
          <>
            <button
              className="close-button"
              onClick={() => setSelectedPlace(null)}
            >
              ❌
            </button>
            <img
              src={selectedPlace.image_url}
              alt="포스터 이미지"
              className="poster-image"
            />
            <h2 className="place-title">📍 {selectedPlace.cafe_name}</h2>
            <p>
              <strong>🏠 주소:</strong>{' '}
              {selectedPlace.road_address + ' ' + selectedPlace.detail_address}
            </p>
            {selectedPlace.start_date && (
              <p>
                <strong>🕒 이벤트 기간:</strong> {selectedPlace.start_date}
              </p>
            )}
            {selectedPlace.goods && selectedPlace.goods.length > 0 && (
              <div className="goods-section">
                <strong>🎁 굿즈 목록:</strong>
                <ul className="goods-list">
                  {selectedPlace.goods.map((item) => (
                    <li key={item.id} className="goods-item">
                      <p>
                        <strong>{item.name}</strong> -{' '}
                        {item.price.toLocaleString()}원
                      </p>
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          className="goods-image"
                        />
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <a
              href={selectedPlace.place_url}
              target="_blank"
              rel="noopener noreferrer"
              className="place-link"
            >
              📌 카카오맵에서 보기
            </a>
          </>
        )}
      </div>

      <div id="myMap" className="map-container" />
      {isEmpty && (
        <div className="no-events-box">
          <p>📭 근처에 등록된 생일카페 이벤트가 없어요.</p>
        </div>
      )}
    </div>
  );
};

export default KakaoMap;
