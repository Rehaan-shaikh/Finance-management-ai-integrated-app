import React, { Suspense } from 'react'
import { BarLoader } from 'react-spinners'
import DasshboardPage from './page'

const Dashboardlayout = () => {
  return (
    <div className="px-5">
        <h1 className='text-5xl md:text-8xl lg:text-[105px] pb-6 gradient-title mb-5'> Dashboard </h1>

        <Suspense fallback={<BarLoader className='mt-4' width={"100%"} color='#9333ea'/>}>
            <DasshboardPage />
        </Suspense>
    </div>
  )
}

export default Dashboardlayout
