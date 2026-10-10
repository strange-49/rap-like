import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useNavigate } from 'react-router-dom'
import {
  clearClientSession,
} from '../../services/auth'

export function UserMenu() {
  const navigate = useNavigate()

  function handleSignOut() {
    clearClientSession()

    navigate('/login', {
      replace: true,
    })
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button">
          Company Menu
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content>
          <DropdownMenu.Item>
            Company Profile
          </DropdownMenu.Item>

          <DropdownMenu.Item>
            Settings
          </DropdownMenu.Item>

          <DropdownMenu.Separator />

          <DropdownMenu.Item
            onSelect={handleSignOut}
          >
            Sign Out
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}