// EventSearchPage.js
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Container,
  Grid,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Chip,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { EventSearchApi } from './api/EventSearchApi';
import NotFoundBox from '../../components/common/NotFoundBox';
import { useNavigate } from 'react-router-dom';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import ShareIcon from '@mui/icons-material/Share';

import './SearchPlaces.css';

const SearchPlaces = () => {
  const [keyword, setKeyword] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [genre, setGenre] = useState('');
  const [events, setEvents] = useState([]);
  const navigate = useNavigate();

  const handleGenreChange = (event, newGenre) => setGenre(newGenre);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await EventSearchApi({
          keyword,
          startDate,
          endDate,
          genre,
        });

        if (Array.isArray(data)) {
          setEvents(data);
        } else {
          setEvents([]);
        }
      } catch (err) {
        console.error("Failed to fetch events:", err);
        setEvents([]);
      }
    };

    fetchEvents();
  }, [keyword, startDate, endDate, genre]);

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Typography variant="h4" fontWeight="bold" gutterBottom>
        이벤트 찾기
      </Typography>

      {/* 필터 영역 */}
      <Box mb={4}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField
              label="이벤트명 검색"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField
              label="시작일"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={6} sm={3}>
            <TextField
              label="종료일"
              type="date"
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              fullWidth
            />
          </Grid>
        </Grid>

        <Box mt={3}>
          <ToggleButtonGroup
            value={genre}
            exclusive
            onChange={handleGenreChange}
            sx={{ '& .MuiToggleButton-root': { mr: 1 } }}
          >
            <ToggleButton value="아이돌">아이돌</ToggleButton>
            <ToggleButton value="유튜버">유튜버</ToggleButton>
            <ToggleButton value="웹툰">웹툰</ToggleButton>
            <ToggleButton value="게임">게임</ToggleButton>
            <ToggleButton value="애니">애니</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* 이벤트 카드 리스트 */}
      <Grid container spacing={3}>
        {events.map((event) => (
          <Grid item xs={12} sm={6} md={6} key={event.id}>
            <Card
              onClick={() => navigate(`/birthday-cafes/${event.id}`)}
              className="event-card-container"
              sx={{ cursor: 'pointer' }}
            >
              <CardMedia
                component="img"
                className="event-card-image"
                image={event.image}
                alt={event.cafe_name}
              />
              <CardContent className="event-card-content">
                <Box>
                  <Box className="event-card-header">
                    <Typography variant="subtitle1" fontWeight="bold">
                      {event.artist_group || '아티스트/그룹명'}
                    </Typography>
                    <Box className="event-card-header-icons">
                      <BookmarkBorderIcon sx={{ color: '#ccc' }} />
                      <ShareIcon sx={{ color: '#ccc' }} />
                    </Box>
                  </Box>

                  <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', mb: 0.5 }}>
                    {event.cafe_name || '이벤트명'}
                  </Typography>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    📍 {event.detail_address || '상세 위치 없음'}
                  </Typography>

                  <Typography variant="body2" color="text.secondary">
                    📅 {event.start_date} ~ {event.end_date}
                  </Typography>
                </Box>

                <Box className="event-card-tags">
                  {event.genre && (
                    <Chip
                      label={event.genre}
                      size="small"
                      className="event-card-chip"
                    />
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
        {events.length === 0 && (
          <Grid item xs={12}>
            <NotFoundBox />
          </Grid>
        )}
      </Grid>
    </Container>
  );
};

export default SearchPlaces;
