import { render } from '@testing-library/react'
import { MagicBolt } from './MagicBolt'

describe('MagicBolt', () => {
  it('renders without crashing', () => {
    render(<MagicBolt startX={50} startY={80} targetX={50} targetY={20} onComplete={jest.fn()} />)
  })
})
