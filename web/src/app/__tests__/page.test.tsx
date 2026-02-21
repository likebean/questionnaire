import { render, screen } from '@testing-library/react'
import Home from '../page'

describe('Home', () => {
  it('shows welcome and link to my surveys', () => {
    render(<Home />)
    expect(screen.getByText('欢迎使用问卷系统')).toBeInTheDocument()
    expect(screen.getByText(/高校问卷管理与填写/)).toBeInTheDocument()
    const link = screen.getByRole('link', { name: '我的问卷' })
    expect(link).toBeInTheDocument()
    expect(link).toHaveAttribute('href', '/surveys')
  })
})
