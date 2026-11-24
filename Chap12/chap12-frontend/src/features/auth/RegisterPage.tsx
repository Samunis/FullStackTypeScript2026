import { useActionState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { register } from './authSlice';
import { useNavigate, Link } from 'react-router';

export function RegisterPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { error } = useAppSelector((state) => state.auth);

  const [, submitAction, isPending] = useActionState(
    async (_prev: null, formData: FormData) => {
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
      const username = formData.get('username') as string;

      const result = await dispatch(register({ email, password, username }));

      if (register.fulfilled.match(result)) {
        navigate('/', { replace: true });
      }

      return null;
    },
    null
  );

  return (
    <form action={submitAction}>
      <h1>Register</h1>
      {error && <p className="error">{error}</p>}
      <input name="username" type="text" placeholder="Username" required />
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password" required />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Registering...' : 'Register'}
      </button>
      <p>
        Already have an account? <Link to="/login">Log In</Link>
      </p>
    </form>
  );
}
