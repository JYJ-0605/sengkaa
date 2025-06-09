import ReportIcon from '@mui/icons-material/Report'; // ✅ 맨 위에 추가
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import axios from 'axios';
import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import LoginConfirmDialog from '../../components/common/LoginConfirmDialog';
import WarningBox from '../../components/common/WarningBox';
import { UserContext } from '../../context/UserContext';
import axiosInstance from '../../shared/api/axiosInstance';
import '../../styles/fade.css'; // ✅ 만든 fade.css 경로에 맞게 import
import ReportModal from './api/ReportModal'; // 신고 모달 컴포넌트 추가

const Board = () => {
  const [posts, setPosts] = useState([]);
  const { user, setUser } = useContext(UserContext);
  const [openPostId, setOpenPostId] = useState(null);
  const [replyContent, setReplyContent] = useState({});
  const [replies, setReplies] = useState({});
  const [filter, setFilter] = useState('all');
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportPostId, setReportPostId] = useState(null);

  const [replyTo, setReplyTo] = useState({}); // 댓글 ID → 대댓글 입력값
  const [parentMap, setParentMap] = useState({}); // postId → parentId (대댓글 달기용)

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [askLogin, setAskLogin] = useState(false);
  const navigate = useNavigate();

  const getDisplayNickname = (nickname) => {
    return nickname === '탈퇴한 사용자' || nickname === 'deleted_user'
      ? '탈퇴한 사용자'
      : nickname;
  };

  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem('userInfo'));

    if (savedUser) {
      // ✅ 서버에 토큰 유효성 검증 요청 보내기 (예: /auth/verify/)
      axiosInstance
        .get('/user/auth/verify/')
        .then(() => {
          setUser(savedUser); // 유효하면 로그인 유지
        })
        .catch(() => {
          localStorage.removeItem('userInfo'); // 무효하면 삭제
          setUser(null);
        });
    }

    fetchPosts('all');
  }, []);
  const fetchPosts = (type, page = 1) => {
    setFilter(type);
    setCurrentPage(page);

    let url = 'https://eventcafe.site/user/posts/';
    if (type === 'open') url = '/user/posts/open/';
    else if (type === 'closed') url = '/user/posts/closed/';

    axios
      .get(url, { params: { page } }) // ✅ 쿼리로 페이지 넘기기
      .then((res) => {
        setPosts(res.data.results); // ✅ 페이지네이션 응답일 때는 .results
        const total = Math.ceil(res.data.count / 5);
        setTotalPages(total);
      })
      .catch((err) => console.error(err));
  };

  const handleReplySubmit = (postId) => {
    if (!replyContent[postId]) return; // 빈 댓글 방지

    if (!user || !user.nickname) {
      const savedUser = JSON.parse(localStorage.getItem('userInfo'));
      if (!savedUser || !savedUser.nickname) {
        setAskLogin(true);
        return;
      } else {
        setUser(savedUser);
      }
    }

    axiosInstance
      .post('/user/posts/replies/', {
        post: postId,
        content: replyContent[postId],
        parent: parentMap[postId] || null, // ✅ 'parent'로 보내야 serializer가 저장함!
      })
      .then((res) => {
        alert('댓글이 등록되었습니다!');
        setReplyContent((prev) => ({ ...prev, [postId]: '' }));
        setParentMap((prev) => ({ ...prev, [postId]: null }));
        fetchReplies(postId); // 🔥 댓글 등록 성공 후 목록 새로고침
      })
      .catch((err) => {
        console.error(err);
        // ✅ 인증 실패 시 로그인 모달
        if (err.response?.status === 401) {
          setAskLogin(true);
          return;
        }
        if (!user) {
          // loading 끝난 뒤에만 질문
          setAskLogin(true); // 모달 오픈
        } else {
          alert('댓글 등록에 실패했습니다.');
        }
      });
  };

  const fetchReplies = (postId) => {
    axios
      .get(`https://eventcafe.site/user/posts/${postId}/replies/`)
      .then((res) => {
        setReplies((prev) => ({ ...prev, [postId]: res.data }));
      })
      .catch((err) => {
        console.error('댓글 가져오기 실패:', err);
      });
  };

  const handleReportClick = (postId) => {
    setReportPostId(postId);
    setIsReportModalOpen(true);
  };

  const closeReportModal = () => {
    setIsReportModalOpen(false);
    setReportPostId(null);
  };

  return (
    <>
      <Box sx={{ maxWidth: 1000, mx: 'auto', my: 6, px: 2 }}>
        {/* ✅ 예쁜 배경 헤더 */}
        <Box
          sx={{
            width: '100%',
            py: 6,
            px: 2,
            borderRadius: 3,
            backgroundColor: '#f0fff4', // 👉 배경색 따로 분리!
            backgroundImage: `
      radial-gradient(circle at 20% 40%, rgba(30, 136, 229, 0.12) 120px, transparent 120px),
      radial-gradient(circle at 70% 60%, rgba(30, 136, 229, 0.08) 120px, transparent 120px),
      radial-gradient(circle at 70% 60%, rgba(30, 136, 229, 0.08) 120px, transparent 120px)
    `,
            backgroundRepeat: 'no-repeat',
            backgroundSize: '100% 100%',
            backgroundPosition: 'center',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            mb: 4,
          }}
        >
          <Typography
            variant="h4"
            fontWeight="bold"
            sx={{
              color: 'Black',
              textShadow: '0 1px 2px rgba(0,0,0,0.1)',
            }}
          >
            🎂 팬 이벤트 공동주최자 모집 게시판
          </Typography>
          <Typography variant="subtitle1" sx={{ mt: 1, color: '#555' }}>
            함께할 동료를 찾고, 더 특별한 이벤트를 만들어보세요 💫
          </Typography>
        </Box>

        <WarningBox />

        <Stack direction="row" spacing={2} sx={{ mb: 4, mt: 4 }}>
          <Button
            variant={filter === 'all' ? 'contained' : 'outlined'}
            onClick={() => fetchPosts('all')}
          >
            전체
          </Button>
          <Button
            variant={filter === 'open' ? 'contained' : 'outlined'}
            onClick={() => fetchPosts('open')}
          >
            모집중
          </Button>
          <Button
            variant={filter === 'closed' ? 'contained' : 'outlined'}
            onClick={() => fetchPosts('closed')}
          >
            모집완료
          </Button>
        </Stack>

        {/* ✅ 글작성 버튼 오른쪽 정렬 */}
        <Box sx={{ textAlign: 'right', mb: 4 }}>
          <Button
            variant="contained"
            onClick={() => {
              if (!user) {
                navigate('/login', {
                  state: { from: '/board' },
                }); // 🔥 비로그인 → 모달 켜기
              } else {
                navigate('/post');
              } // 로그인 → 글쓰기 페이지
            }}
          >
            글 작성
          </Button>
        </Box>

        {/* 글 목록 */}
        <TransitionGroup>
          {posts.map((post) => (
            <CSSTransition key={post.id} timeout={300} classNames="fade">
              <Paper
                onClick={() => {
                  setOpenPostId(post.id);
                  fetchReplies(post.id);
                }}
                elevation={1}
                sx={{
                  p: 3,
                  mb: 3,
                  border: '1px solid #e0e0e0',
                  borderRadius: 2,
                  backgroundColor: '#fff',
                  position: 'relative', // ✅ 신고버튼 위치 유지!
                  cursor: 'pointer',
                  '&:hover': {
                    borderColor: '#1e88e5',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.06)',
                  },
                }}
              >
                {/* 작성자 정보 */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar
                    src={post.profile_image}
                    alt={post.nickname}
                    sx={{ cursor: 'pointer' }}
                    onClick={() => {
                      if (post.nickname !== '탈퇴한 사용자') {
                        navigate(`/profile/${post.nickname}`);
                      }
                    }}
                  />
                  <Box>
                    <Typography
                      variant="subtitle2"
                      fontWeight="bold"
                      sx={{ cursor: 'pointer' }}
                      onClick={() => {
                        if (post.nickname !== '탈퇴한 사용자') {
                          navigate(`/profile/${post.nickname}`);
                        }
                      }}
                    >
                      {getDisplayNickname(post.nickname)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(post.created_at).toLocaleString()}
                    </Typography>
                  </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                <Typography variant="h6" fontWeight="bold" gutterBottom>
                  {post.title}
                </Typography>

                <Typography
                  variant="body2"
                  sx={{
                    whiteSpace: 'pre-line',
                    color: '#444',
                    lineHeight: 1.6,
                    ...(openPostId !== post.id && {
                      maxHeight: '120px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }),
                  }}
                >
                  {post.content}
                </Typography>

                {post.image && (
                  <Box mt={2}>
                    <img
                      src={`${post.image}`}
                      alt="썸네일"
                      style={{
                        width: '100%',
                        borderRadius: 8,
                        maxWidth: '500px', // 💡 너무 크지 않게 조절
                        maxHeight: '700px',
                        objectPosition: 'center',
                        objectFit: 'cover', // ✨ 이미지가 비율 유지하면서 잘려도 예쁘게
                      }}
                    />
                  </Box>
                )}

                <Chip
                  label={post.is_open ? '모집중' : '모집완료'}
                  color={post.is_open ? 'success' : 'default'}
                  size="small"
                />

                {user?.nickname === post.nickname && (
                  <Box
                    sx={{
                      textAlign: 'right',
                      mt: 2,
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: 1,
                    }}
                  >
                    <Button
                      variant="outlined"
                      color="primary"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/post/edit/${post.id}`); // 수정 페이지로 이동
                      }}
                    >
                      게시글 수정
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('정말 게시글을 삭제하시겠습니까?')) {
                          axiosInstance
                            .delete(`/user/posts/${post.id}/`)
                            .then(() => {
                              alert('삭제되었습니다!');
                              setPosts((prev) =>
                                prev.filter((p) => p.id !== post.id)
                              );
                            })
                            .catch(() => alert('삭제 실패'));
                        }
                      }}
                    >
                      게시글 삭제
                    </Button>
                  </Box>
                )}

                <Button
                  variant="text"
                  color="error"
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    minWidth: 0,
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    '&:hover': {
                      backgroundColor: 'rgba(255,0,0,0.1)',
                    },
                  }}
                  onClick={() => handleReportClick(post.id)}
                >
                  <ReportIcon fontSize="small" />
                </Button>

                {isReportModalOpen && (
                  <ReportModal
                    postId={reportPostId}
                    onClose={closeReportModal}
                  />
                )}

                {openPostId === post.id && (
                  <>
                    {!replies[post.id] || replies[post.id].length === 0 ? (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ pl: 2, mt: 2 }}
                      >
                        아직 댓글이 없어요! 🥲
                      </Typography>
                    ) : (
                      replies[post.id]?.map((reply) => {
                        const isReply = reply.parent_id !== null;

                        return (
                          <Box
                            key={reply.id}
                            sx={{
                              mt: 1,
                              pl: isReply ? 4 : 2,
                              py: 1,
                              px: 2,
                              borderRadius: 1,
                              backgroundColor: isReply ? '#f5f5f5' : 'f9f9f9',
                            }}
                          >
                            {/* 댓글 본문 영역 */}
                            <Box
                              sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                              }}
                            >
                              <Avatar
                                alt={reply.user.nickname}
                                src={reply.user.profile_image}
                                sx={{
                                  width: 28,
                                  height: 28,
                                  cursor: 'pointer',
                                }}
                                onClick={() =>
                                  navigate(`/profile/${reply.user.nickname}`)
                                }
                              />
                              <Typography
                                variant="body2"
                                sx={{ lineHeight: 1.4 }}
                              >
                                <span
                                  style={{
                                    fontWeight: 'bold',
                                    color: '#1976d2',
                                    cursor: 'pointer',
                                  }}
                                  onClick={() =>
                                    navigate(`/profile/${reply.user.nickname}`)
                                  }
                                >
                                  {getDisplayNickname(reply.user.nickname)}
                                </span>{' '}
                                ({new Date(reply.created_at).toLocaleString()}):{' '}
                                {reply.content}
                              </Typography>
                            </Box>

                            {/* 버튼 영역 (오른쪽 아래 정렬) */}
                            <Box
                              sx={{
                                display: 'flex',
                                justifyContent: 'flex-end',
                                gap: 1,
                                mt: 1,
                              }}
                            >
                              {/* 답글 버튼 (항상 노출) */}
                              <Button
                                variant="text"
                                size="small"
                                onClick={() =>
                                  setParentMap((prev) => ({
                                    ...prev,
                                    [post.id]: reply.id,
                                  }))
                                }
                              >
                                답글
                              </Button>

                              {/* 본인일 때만 수정/삭제 노출 */}
                              {reply.user.nickname === user?.nickname && (
                                <>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={() => {
                                      const newContent = prompt(
                                        '댓글을 수정하세요',
                                        reply.content
                                      );
                                      if (
                                        !newContent ||
                                        newContent.trim() === ''
                                      )
                                        return;
                                      axiosInstance
                                        .patch(
                                          `/user/posts/replies/${reply.id}/`,
                                          {
                                            content: newContent,
                                          }
                                        )
                                        .then(() => {
                                          alert('수정 완료!');
                                          fetchReplies(post.id);
                                        })
                                        .catch(() => alert('수정 실패'));
                                    }}
                                  >
                                    수정
                                  </Button>
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    color="error"
                                    onClick={() => {
                                      if (
                                        window.confirm(
                                          '댓글을 삭제하시겠습니까?'
                                        )
                                      ) {
                                        axiosInstance
                                          .delete(
                                            `/user/posts/replies/${reply.id}/`
                                          )
                                          .then(() => fetchReplies(post.id))
                                          .catch(() => alert('삭제 실패'));
                                      }
                                    }}
                                  >
                                    삭제
                                  </Button>
                                </>
                              )}
                            </Box>

                            {reply.children?.length > 0 && (
                              <Box sx={{ mt: 1, ml: 4 }}>
                                {reply.children.map((child) => (
                                  <Box
                                    key={child.id}
                                    sx={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 1,
                                      py: 1,
                                    }}
                                  >
                                    <Avatar
                                      alt={child.user.nickname}
                                      src={child.user.profile_image}
                                      sx={{
                                        width: 28,
                                        height: 28,
                                        cursor: 'pointer',
                                      }}
                                      onClick={() =>
                                        navigate(
                                          `/profile/${child.user.nickname}`
                                        )
                                      }
                                    />

                                    <Typography
                                      variant="body2"
                                      sx={{ lineHeight: 1.4 }}
                                    >
                                      <span
                                        style={{
                                          fontWeight: 'bold',
                                          color: '#1976d2',
                                          cursor: 'pointer',
                                        }}
                                        onClick={() =>
                                          navigate(
                                            `/profile/${child.user.nickname}`
                                          )
                                        }
                                      >
                                        {child.user.nickname}
                                      </span>{' '}
                                      (
                                      {new Date(
                                        child.created_at
                                      ).toLocaleString()}
                                      ): {child.content}
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>
                            )}
                          </Box>
                        );
                      })
                    )}
                    <Box mt={2}>
                      {/* ✅ 여기다 바로 넣으면 돼 */}
                      {(() => {
                        const parentId = parentMap[post.id];
                        const parentReply = replies[post.id]?.find(
                          (r) => r.id === parentId
                        );
                        if (!parentId || !parentReply) return null;

                        return (
                          <Typography
                            variant="caption"
                            color="primary"
                            sx={{ mb: 1, display: 'block' }}
                          >
                            {parentReply.user.nickname}님에게 답글 작성 중
                            <Button
                              size="small"
                              onClick={() =>
                                setParentMap((prev) => ({
                                  ...prev,
                                  [post.id]: null,
                                }))
                              }
                            >
                              취소
                            </Button>
                          </Typography>
                        );
                      })()}
                      <Stack direction="row" spacing={1} alignItems="center">
                        <input
                          type="text"
                          placeholder="댓글을 입력하세요"
                          value={replyContent[post.id] || ''}
                          onChange={(e) =>
                            setReplyContent((prev) => ({
                              ...prev,
                              [post.id]: e.target.value,
                            }))
                          }
                          style={{
                            flexGrow: 1,
                            padding: '8px',
                            border: '1px solid #ccc',
                            borderRadius: '6px',
                          }}
                        />
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => handleReplySubmit(post.id)}
                        >
                          등록
                        </Button>
                      </Stack>
                    </Box>
                  </>
                )}
              </Paper>
            </CSSTransition>
          ))}
        </TransitionGroup>
        {/* 페이지네이션 버튼 */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'center',
            mt: 6,
            flexWrap: 'wrap',
            gap: 1,
          }}
        >
          {/* 이전 버튼 */}
          <Button
            variant="outlined"
            size="small"
            disabled={currentPage === 1}
            onClick={() => fetchPosts(filter, currentPage - 1)}
            sx={{
              borderRadius: '20px',
              minWidth: '40px',
              '&.Mui-disabled': {
                backgroundColor: '#f0f0f0',
                color: '#aaa',
              },
            }}
          >
            ◀
          </Button>

          {/* 숫자 버튼 */}
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(
            (pageNum) => (
              <Button
                key={pageNum}
                variant={currentPage === pageNum ? 'contained' : 'outlined'}
                size="small"
                onClick={() => fetchPosts(filter, pageNum)}
                sx={{
                  borderRadius: '50%',
                  minWidth: '36px',
                  height: '36px',
                  backgroundColor:
                    currentPage === pageNum ? '#6C63FF' : 'transparent',
                  color: currentPage === pageNum ? '#fff' : '#444',
                  borderColor: '#ccc',
                  '&:hover': {
                    backgroundColor:
                      currentPage === pageNum ? '#5a55d3' : '#f5f5f5',
                  },
                }}
              >
                {pageNum}
              </Button>
            )
          )}

          {/* 다음 버튼 */}
          <Button
            variant="outlined"
            size="small"
            disabled={currentPage === totalPages}
            onClick={() => fetchPosts(filter, currentPage + 1)}
            sx={{
              borderRadius: '20px',
              minWidth: '40px',
              '&.Mui-disabled': {
                backgroundColor: '#f0f0f0',
                color: '#aaa',
              },
            }}
          >
            ▶
          </Button>
        </Box>
      </Box>

      <LoginConfirmDialog
        open={askLogin}
        onClose={() => setAskLogin(false)} // 취소
        onConfirm={
          () => navigate('/login', { state: { from: '/board' } }) // 로그인
        }
      />
    </>
  );
};
export default Board;
