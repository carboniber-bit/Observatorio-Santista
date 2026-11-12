import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { VoteForm } from './VoteForm';

const CANDIDATES = [
  { id: 'a', name: 'Ana Alves' },
  { id: 'b', name: 'Bruno Braga' },
  { id: 'c', name: 'Carla Costa' },
  { id: 'd', name: 'Diego Dias' },
];

type Call = { url: string; init?: RequestInit };

function makeFetch(postStatus = 200, postBody: unknown = { status: 'recorded' }) {
  const calls: Call[] = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init });
    if (init?.method === 'POST') {
      return new Response(JSON.stringify(postBody), {
        status: postStatus,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(null, { status: 204 });
  }) as typeof fetch;
  return { impl, calls, posts: () => calls.filter((c) => c.init?.method === 'POST') };
}

function FakeCaptcha({ onToken }: { onToken: (t: string | null) => void }) {
  return (
    <button type="button" onClick={() => onToken('tok')}>
      Gerar token
    </button>
  );
}

function renderForm(fetchImpl: typeof fetch) {
  return render(
    <VoteForm candidates={CANDIDATES} siteKey="k" CaptchaComponent={FakeCaptcha} fetchImpl={fetchImpl} />,
  );
}

function fillAll(candidate = 'Bruno Braga') {
  fireEvent.click(screen.getByLabelText('Sim'));
  fireEvent.click(screen.getByLabelText(candidate));
  fireEvent.click(screen.getByRole('button', { name: 'Gerar token' }));
}

const submit = () => screen.getByRole('button', { name: /Registrar voto|Enviando/ });

describe('VoteForm', () => {
  it('não mostra candidatos antes da pergunta de sócio e mostra depois', () => {
    renderForm(makeFetch().impl);
    expect(screen.getByRole('group', { name: 'Você é sócio do Santos?' })).toBeInTheDocument();
    expect(screen.queryByText('Ana Alves')).not.toBeInTheDocument();
    expect(screen.queryByText('Em quem você votaria?')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Não'));
    expect(screen.getByRole('group', { name: 'Em quem você votaria?' })).toBeInTheDocument();
    expect(screen.getByText('Ana Alves')).toBeInTheDocument();
  });

  it('mantém o botão desabilitado até sócio, candidato e captcha', () => {
    renderForm(makeFetch().impl);
    expect(submit()).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Sim'));
    expect(submit()).toBeDisabled();
    fireEvent.click(screen.getByLabelText('Branco/Indeciso'));
    expect(submit()).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Gerar token' }));
    expect(submit()).toBeEnabled();
  });

  it('exibe aviso de privacidade e a frase de votação espontânea na primeira renderização', () => {
    renderForm(makeFetch().impl);
    expect(screen.getByText(/Seu voto é anônimo/)).toBeInTheDocument();
    expect(
      screen.getByText(/votação espontânea, não é pesquisa científica/),
    ).toBeInTheDocument();
  });

  it('409 informa voto já registrado e leva aos resultados', async () => {
    renderForm(makeFetch(409, { status: 'already_voted' }).impl);
    fillAll();
    fireEvent.click(submit());
    expect(await screen.findByText('Seu voto já foi registrado neste navegador.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver resultados' })).toHaveAttribute('href', '/resultados');
  });

  it('200 mostra confirmação em role=status', async () => {
    renderForm(makeFetch().impl);
    fillAll();
    fireEvent.click(submit());
    expect(await screen.findByRole('status')).toHaveTextContent('Voto registrado. Obrigado por participar!');
  });

  it('410 mostra a mensagem do corpo e link para resultados congelados', async () => {
    renderForm(makeFetch(410, { status: 'closed', message: 'Votação encerrada em 11/12/2026.' }).impl);
    fillAll();
    fireEvent.click(submit());
    expect(await screen.findByText('Votação encerrada em 11/12/2026.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver resultados congelados' })).toHaveAttribute(
      'href',
      '/resultados',
    );
  });

  it('renderiza os 4 candidatos na ordem dada, com a mesma marcação, e Branco/Indeciso por último', () => {
    renderForm(makeFetch().impl);
    fireEvent.click(screen.getByLabelText('Sim'));
    const group = screen.getByRole('group', { name: 'Em quem você votaria?' });
    const radios = Array.from(group.querySelectorAll('input[type="radio"]')) as HTMLInputElement[];
    const labels = radios.map((r) => r.closest('label') as HTMLLabelElement);
    expect(labels.map((l) => l.textContent)).toEqual([
      'Ana Alves',
      'Bruno Braga',
      'Carla Costa',
      'Diego Dias',
      'Branco/Indeciso',
    ]);
    const classes = new Set(labels.map((l) => l.className));
    expect(classes.size).toBe(1);
    expect(new Set(radios.map((r) => r.className)).size).toBe(1);
    expect(labels.every((l) => l.querySelectorAll('img').length === 0)).toBe(true);
  });

  it('envia POST JSON exatamente com candidateId, isSocio e turnstileToken', async () => {
    const f = makeFetch();
    renderForm(f.impl);
    fillAll();
    fireEvent.click(submit());
    await waitFor(() => expect(f.posts()).toHaveLength(1));
    const post = f.posts()[0];
    expect(post.url).toBe('/api/vote');
    expect(post.init?.method).toBe('POST');
    expect(new Headers(post.init?.headers).get('content-type')).toBe('application/json');
    expect(JSON.parse(String(post.init?.body))).toEqual({
      candidateId: 'b',
      isSocio: true,
      turnstileToken: 'tok',
    });
  });

  it('envia candidateId null para Branco/Indeciso', async () => {
    const f = makeFetch();
    renderForm(f.impl);
    fillAll('Branco/Indeciso');
    fireEvent.click(submit());
    await waitFor(() => expect(f.posts()).toHaveLength(1));
    expect(JSON.parse(String(f.posts()[0].init?.body)).candidateId).toBeNull();
  });

  it('chama GET /api/vote uma vez ao montar', async () => {
    const f = makeFetch();
    renderForm(f.impl);
    await waitFor(() => expect(f.calls.length).toBeGreaterThan(0));
    const gets = f.calls.filter((c) => c.init?.method !== 'POST');
    expect(gets).toHaveLength(1);
    expect(gets[0].url).toBe('/api/vote');
  });

  it('403 limpa o token, desabilita o botão e mostra a mensagem do captcha', async () => {
    renderForm(makeFetch(403, { status: 'captcha_failed' }).impl);
    fillAll();
    fireEvent.click(submit());
    expect(
      await screen.findByText('Não foi possível confirmar a verificação anti-robô. Tente novamente.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(submit()).toBeDisabled();
  });

  it('erro de rede mostra mensagem genérica', async () => {
    const impl = (async (_i: RequestInfo | URL, init?: RequestInit) => {
      if (init?.method === 'POST') throw new Error('offline');
      return new Response(null, { status: 204 });
    }) as typeof fetch;
    renderForm(impl);
    fillAll();
    fireEvent.click(submit());
    expect(
      await screen.findByText('Não foi possível registrar seu voto agora. Tente novamente em instantes.'),
    ).toBeInTheDocument();
  });

  it('duplo clique envia apenas um POST', async () => {
    const f = makeFetch();
    renderForm(f.impl);
    fillAll();
    const btn = submit();
    fireEvent.click(btn);
    fireEvent.click(btn);
    await screen.findByRole('status');
    expect(f.posts()).toHaveLength(1);
  });
});
