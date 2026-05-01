import { renderHook } from '@testing-library/react'
import { useSession } from './useSession'

describe('useSession', () => {
  it('returns mock session with user data', () => {
    const { result } = renderHook(() => useSession())
    
    expect(result.current.status).toBe('authenticated')
    expect(result.current.data?.user).toEqual({
      id: 'mock-user-id',
      name: 'Player',
      email: 'player@example.com',
      xp: 0,
      role: 'student',
      level: 1,
    })
  })

  it('has update function', () => {
    const { result } = renderHook(() => useSession())
    
    expect(typeof result.current.update).toBe('function')
  })
})
