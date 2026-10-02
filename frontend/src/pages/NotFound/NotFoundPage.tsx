import React from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '../../components/ui/EmptyState'
import { Button } from '../../components/ui/Button'

export const NotFoundPage: React.FC = () => {
  return (
    <div
      style={{
        minHeight: '60vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <EmptyState
        icon={<span>🧭</span>}
        title="Page Not Found"
        description="The requested educational route does not exist or has been restructured."
        action={
          <Link to="/dashboard" style={{ textDecoration: 'none' }}>
            <Button variant="primary" size="md">
              Return to Dashboard
            </Button>
          </Link>
        }
      />
    </div>
  )
}
