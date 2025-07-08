
import React, { Suspense } from "react";
import AddTransactionForm from "../_components/transaction-form";

export default function AddTransactionPage() {
  return <Suspense fallback={<div>Loading...</div>}>
   <AddTransactionForm />
  </Suspense>
   ;
}
