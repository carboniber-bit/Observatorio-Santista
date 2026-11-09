import { render, screen } from '@testing-library/react';
import { IndependenceBanner } from './IndependenceBanner';

describe('IndependenceBanner', () => {
  it('exibe o aviso de independência no rodapé (contentinfo)', () => {
    render(<IndependenceBanner />);
    expect(screen.getByRole('contentinfo')).toHaveTextContent(
      'sem vínculo oficial com o Santos Futebol Clube',
    );
  });
});
