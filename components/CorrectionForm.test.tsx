import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CorrectionForm } from './CorrectionForm'

type Call = { url: string; init?: RequestInit }

function makeFetch(status = 200, hold?: Promise<void>) {
  const calls: Call[] = []
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init })
    if (hold) await hold
    return new Response(JSON.stringify({ status: 'x' }), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  }) as typeof fetch
  return { impl, calls }
}

function fill(text = '  Ano de fundação errado.  ') {
  fireEvent.change(screen.getByLabelText('O que precisa ser corrigido?'), { target: { value: text } })
}

const SUBMIT = 'Enviar pedido de correção'

describe('CorrectionForm', () => {
  it('mostra os campos com rótulos e o campo-isca escondido', () => {
    render(<CorrectionForm fetchImpl={makeFetch().impl} />)
    expect(screen.getByLabelText('O que precisa ser corrigido?')).toBeTruthy()
    const link = screen.getByLabelText('Link da fonte (opcional)')
    expect(link.getAttribute('type')).toBe('url')
    const email = screen.getByLabelText('E-mail para retorno (opcional)')
    expect(email.getAttribute('type')).toBe('email')
    expect(screen.getByRole('button', { name: SUBMIT })).toBeTruthy()

    const honeypot = document.querySelector('input[name="website"]') as HTMLInputElement
    expect(honeypot).not.toBeNull()
    expect(honeypot.getAttribute('tabindex')).toBe('-1')
    expect(honeypot.getAttribute('autocomplete')).toBe('off')
    expect(honeypot.closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('o contador acompanha o texto', () => {
    render(<CorrectionForm fetchImpl={makeFetch().impl} />)
    expect(screen.getByText('0/2000')).toBeTruthy()
    fill('abcde')
    expect(screen.getByText('5/2000')).toBeTruthy()
    expect(screen.getByLabelText('O que precisa ser corrigido?').getAttribute('maxlength')).toBe('2000')
  })

  it('envia JSON com valores aparados e sem link/e-mail vazios', async () => {
    const f = makeFetch()
    render(<CorrectionForm fetchImpl={f.impl} />)
    fill()
    fireEvent.click(screen.getByRole('button', { name: SUBMIT }))
    await waitFor(() => expect(f.calls).toHaveLength(1))
    expect(f.calls[0].url).toBe('/api/corrections')
    expect(f.calls[0].init?.method).toBe('POST')
    expect(JSON.parse(String(f.calls[0].init?.body))).toEqual({
      body: 'Ano de fundação errado.',
      website: '',
    })
  })

  it('envia link e e-mail quando preenchidos', async () => {
    const f = makeFetch()
    render(<CorrectionForm fetchImpl={f.impl} />)
    fill('Texto')
    fireEvent.change(screen.getByLabelText('Link da fonte (opcional)'), {
      target: { value: ' https://exemplo.test/fonte ' },
    })
    fireEvent.change(screen.getByLabelText('E-mail para retorno (opcional)'), {
      target: { value: 'a@exemplo.test' },
    })
    fireEvent.click(screen.getByRole('button', { name: SUBMIT }))
    await waitFor(() => expect(f.calls).toHaveLength(1))
    expect(JSON.parse(String(f.calls[0].init?.body))).toEqual({
      body: 'Texto',
      link: 'https://exemplo.test/fonte',
      email: 'a@exemplo.test',
      website: '',
    })
  })

  it('200 mostra a confirmação e esconde o formulário', async () => {
    render(<CorrectionForm fetchImpl={makeFetch(200).impl} />)
    fill()
    fireEvent.click(screen.getByRole('button', { name: SUBMIT }))
    const status = await screen.findByRole('status')
    expect(status.textContent).toBe('Pedido de correção recebido. Obrigado!')
    expect(screen.queryByLabelText('O que precisa ser corrigido?')).toBeNull()
  })

  it('400 mostra a mensagem de revisão', async () => {
    render(<CorrectionForm fetchImpl={makeFetch(400).impl} />)
    fill()
    fireEvent.click(screen.getByRole('button', { name: SUBMIT }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('Revise o texto do pedido (obrigatório, até 2.000 caracteres).')
  })

  it('429 mostra a mensagem de limite', async () => {
    render(<CorrectionForm fetchImpl={makeFetch(429).impl} />)
    fill()
    fireEvent.click(screen.getByRole('button', { name: SUBMIT }))
    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('Você enviou muitos pedidos em pouco tempo. Tente novamente mais tarde.')
  })

  it('outros status e falha de rede mostram a mensagem genérica', async () => {
    const generic = 'Não foi possível enviar seu pedido agora. Tente novamente em instantes.'
    const { unmount } = render(<CorrectionForm fetchImpl={makeFetch(500).impl} />)
    fill()
    fireEvent.click(screen.getByRole('button', { name: SUBMIT }))
    expect((await screen.findByRole('alert')).textContent).toBe(generic)
    unmount()

    const failing = (async () => {
      throw new Error('rede')
    }) as unknown as typeof fetch
    render(<CorrectionForm fetchImpl={failing} />)
    fill()
    fireEvent.click(screen.getByRole('button', { name: SUBMIT }))
    expect((await screen.findByRole('alert')).textContent).toBe(generic)
  })

  it('clique duplo envia um único POST', async () => {
    let release: () => void = () => {}
    const hold = new Promise<void>((resolve) => {
      release = resolve
    })
    const f = makeFetch(200, hold)
    render(<CorrectionForm fetchImpl={f.impl} />)
    fill()
    const button = screen.getByRole('button', { name: SUBMIT })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(f.calls).toHaveLength(1)
    release()
    await screen.findByRole('status')
    expect(f.calls).toHaveLength(1)
  })
})
