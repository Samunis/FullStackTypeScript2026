import { useEffect, useOptimistic, useState, useTransition } from 'react';
import { Link } from 'react-router';
import { postsApi } from '../../api/endpoints';
import { useAppSelector } from '../../store/hooks';
import type { Post } from '../../types';

export function PostsPage() {
  const user = useAppSelector((state) => state.auth.user);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [optimisticPosts, removeOptimistic] = useOptimistic(
    posts,
    (current, deletedId: number) => current.filter((p) => p.id !== deletedId)
  );
  const [, startTransition] = useTransition();

  useEffect(() => {
    postsApi
      .getAll()
      .then((res) => setPosts(res.data))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load posts'))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return <p>Loading posts...</p>;
  }

  async function handleDelete(id: number) {
    setError(null);
    startTransition(async () => {
      removeOptimistic(id);
      try {
        await postsApi.delete(String(id));
        setPosts((prev) => prev.filter((p) => p.id !== id));
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to delete post');
      }
    });
  }

  return (
    <div>
      <h1>Posts</h1>
      <Link to="/posts/new">Create Post</Link>
      {error && <p className="error">{error}</p>}
      {optimisticPosts.length === 0 && <p>No posts yet.</p>}
      {optimisticPosts.map((post) => (
        <article key={post.id}>
          <Link to={`/posts/${post.id}`}>
            <h2>{post.title}</h2>
          </Link>
          {post.author && <small>by {post.author.username}</small>}
          <p>
            {(post.content ?? '').slice(0, 150)}
            {(post.content ?? '').length > 150 ? '...' : ''}
          </p>
          {(user?.id === post.authorId || user?.role === 'ADMIN') && (
            <button onClick={() => handleDelete(post.id)}>Delete</button>
          )}
        </article>
      ))}
    </div>
  );
}
