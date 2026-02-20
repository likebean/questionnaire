import { render, screen } from '@testing-library/react'
import Home from '../page'

jest.mock('@/services/api', () => ({
  healthApi: {
    getHealth: jest.fn(),
  },
}))

const healthApi = require('@/services/api').healthApi

describe('Home', () => {
  it('shows loading initially then health data when API succeeds', async () => {
    ;(healthApi.getHealth as jest.Mock).mockResolvedValue({
      code: 200,
      message: 'success',
      data: {
        status: 'UP',
        service: 'questionnaire-api',
        timestamp: '2025-01-01T00:00:00Z',
      },
    })

    render(<Home />)
    expect(screen.getByText(/加载中/)).toBeInTheDocument()

    const status = await screen.findByText('UP', {}, { timeout: 3000 })
    expect(status).toBeInTheDocument()
    expect(screen.getByText('questionnaire-api')).toBeInTheDocument()
  })

  it('shows error when API fails', async () => {
    ;(healthApi.getHealth as jest.Mock).mockRejectedValue(new Error('Network Error'))

    render(<Home />)
    await screen.findByText('服务异常', {}, { timeout: 3000 })
    expect(screen.getByText('Network Error')).toBeInTheDocument()
  })
})
