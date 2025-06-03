import { getUserAccounts } from '@/actions/dashboard'
import AccountDrawer from '@/components/account-drawer'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Plus } from 'lucide-react'
import React from 'react'
import { AccountCard } from './_components/accountCard'

const DasshboardPage =async () => {

  const accounts = await getUserAccounts();

  return (
    <div className='px-5'>

      {/* Accounts Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AccountDrawer>
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-dashed">
            <CardContent className="flex flex-col items-center justify-center text-muted-foreground h-full pt-5">
              <Plus className="h-10 w-10 mb-2" />
              <p className="text-sm font-medium">Add New Account</p>
            </CardContent>
          </Card>
        </AccountDrawer>
        
        {accounts.length > 0 &&
          accounts?.map((account) => (
            <AccountCard key={account.id} account={account} />
          ))}
      </div>
    </div>
  )
}

export default DasshboardPage