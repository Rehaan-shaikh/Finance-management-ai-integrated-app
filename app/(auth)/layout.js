import React from 'react'

const Authlayout = ({children}) => {
  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-gray-100'>
      {children}
    </div>
  )
}

export default Authlayout
