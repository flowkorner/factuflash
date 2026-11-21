import { act, renderHook } from '@testing-library/react';
import {
  CONFIRMATION_DEADLINE_MS,
  CONFIRMATION_INTERVAL_MS,
  usePaymentConfirmation,
} from './usePaymentConfirmation';

const refresh = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

describe('usePaymentConfirmation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    refresh.mockReset();
  });
  afterEach(() => jest.useRealTimers());

  it('relit la base toutes les 3 s, puis s’arrête au bout de 90 s', () => {
    const { result } = renderHook(() => usePaymentConfirmation(true));

    act(() => jest.advanceTimersByTime(CONFIRMATION_INTERVAL_MS * 3));
    expect(refresh).toHaveBeenCalledTimes(3);
    expect(result.current.timedOut).toBe(false);

    act(() => jest.advanceTimersByTime(CONFIRMATION_DEADLINE_MS));
    expect(result.current.timedOut).toBe(true);
    const calls = refresh.mock.calls.length;
    act(() => jest.advanceTimersByTime(CONFIRMATION_INTERVAL_MS * 5));
    expect(refresh).toHaveBeenCalledTimes(calls);
  });

  it('« Vérifier à nouveau » relance une période d’attente', () => {
    const { result } = renderHook(() => usePaymentConfirmation(true));
    act(() => jest.advanceTimersByTime(CONFIRMATION_DEADLINE_MS + CONFIRMATION_INTERVAL_MS));
    expect(result.current.timedOut).toBe(true);

    act(() => result.current.retry());
    expect(result.current.timedOut).toBe(false);
    act(() => jest.advanceTimersByTime(CONFIRMATION_INTERVAL_MS));
    expect(refresh).toHaveBeenCalled();
  });

  it('ne fait rien quand il n’y a rien à attendre', () => {
    renderHook(() => usePaymentConfirmation(false));
    act(() => jest.advanceTimersByTime(CONFIRMATION_DEADLINE_MS));
    expect(refresh).not.toHaveBeenCalled();
  });
});
