import { render, screen } from '@testing-library/react';
import App from './App';

test('renders the login page for an unauthenticated visitor', async () => {
  render(<App />);

  // AuthProvider briefly shows a loading screen while it checks localStorage,
  // then renders the public Login route since no auth token is present.
  const heading = await screen.findByText(/welcome back/i);
  expect(heading).toBeInTheDocument();

  expect(screen.getByText(/sign in to continue your wellness journey/i)).toBeInTheDocument();
});