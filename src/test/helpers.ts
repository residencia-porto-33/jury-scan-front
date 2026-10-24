import { screen } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import { http, HttpResponse, type JsonBodyType } from 'msw';

import type { AnalyzeRequest } from '../features/analysis/types';
import { ANALYZE_URL } from '../mocks/handlers';
import { server } from '../mocks/server';

export async function pasteText(user: UserEvent, text: string) {
  await user.click(screen.getByLabelText('Texto do extrato do CNIS'));
  await user.paste(text);
}

export async function pasteAndAnalyze(user: UserEvent, text: string) {
  await pasteText(user, text);
  await user.click(screen.getByRole('button', { name: /^Analisar/ }));
}

/** Substitui o handler de /api/analyze por uma sequência de respostas, registrando os corpos enviados. */
export function mockAnalyzeSequence(...responses: Array<() => Response | Promise<Response>>) {
  const bodies: AnalyzeRequest[] = [];
  let call = 0;
  server.use(
    http.post(ANALYZE_URL, async ({ request }) => {
      bodies.push((await request.json()) as AnalyzeRequest);
      const respond = responses[Math.min(call, responses.length - 1)]!;
      call += 1;
      return respond();
    }),
  );
  return bodies;
}

export const respondJson =
  (body: JsonBodyType, status = 200, headers?: Record<string, string>) =>
  () =>
    HttpResponse.json(body, { status, ...(headers ? { headers } : {}) });

export function liveRegion(): HTMLElement {
  return document.querySelector<HTMLElement>('[aria-live="polite"][aria-atomic="true"]')!;
}
