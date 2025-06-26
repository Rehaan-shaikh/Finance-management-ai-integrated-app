"use client";

import { useEffect, useState, useTransition } from "react";
import { useActionState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import { createTransaction, updateTransaction, getTransaction } from "@/actions/transaction";
import { getUserAccounts } from "@/actions/dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { defaultCategories } from "@/data/categories";
import { ReceiptScanner } from "./recipt-scanner";

export default function AddTransactionForm() {
  const category = defaultCategories;

  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [accounts, setAccounts] = useState([]);
  const [transaction, setTransaction] = useState(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [type, setType] = useState("INCOME");
  const [selectedCategory, setSelectedCategory] = useState("");

  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  let isScan = false;

  const isEditMode = !!editId && !!transaction;

  useEffect(() => {
    const fetchData = async () => {
      // setAccounts will set the accounts whether you're in add or edit mode.
      const accountsData = await getUserAccounts();
      setAccounts(accountsData);

      if (editId) {
        const transactionData = await getTransaction(editId);
        setTransaction(transactionData);
        console.log("Fetched transaction data:", transactionData);
        setIsRecurring(transactionData?.isRecurring || false);
      }
    };

    fetchData();
  }, [editId]);


  // Que: Why can’t we just set defaultValue from scannedData for type and category?
  // Ans: refer this last quen https://chatgpt.com/share/685d108f-0eec-8007-937c-042d00341629
  useEffect(() => {  //this useEffect is used to set default type and category in form based on edit or scan data 
    if (transaction?.type) {
      setType(transaction.type);
    } else if (scannedData?.category) {
      const lower = scannedData.category.toLowerCase();
      const isExpense = ["groceries", "food", "shopping", "rent"].includes(lower);
      setType(isExpense ? "EXPENSE" : "INCOME");
    }

    if (transaction?.category) {
      setSelectedCategory(transaction.category);
    } else if (scannedData?.category) {
      const matched = category.find(
        (cat) =>
          cat.name.toLowerCase() === scannedData.category.toLowerCase() ||
          cat.id.toLowerCase() === scannedData.category.toLowerCase()
      );
      setSelectedCategory(matched?.id || "");
    }
  }, [transaction, scannedData, category]);

  const handleSubmit = async (prevState, formData) => {
    if (isEditMode) {
      const data = Object.fromEntries(formData.entries());
      data.amount = parseFloat(data.amount);
      data.isRecurring = data.isRecurring === "on";
      if (!data.isRecurring) data.recurringInterval = null;
      return await updateTransaction(transaction.id, data);
    }

    return await createTransaction(formData);
  };

  const [formState, formAction] = useActionState(handleSubmit, {
    errors: {},
    success: false,
  });

  useEffect(() => {
    if (formState.success) {
      toast.success(`Transaction ${isEditMode ? "updated" : "created"}`);
      const accountId = isEditMode
        ? transaction?.accountId
        : formState?.data?.accountId;
      if (accountId) {
        router.push(`/account/${accountId}`);
      }
    }
  }, [formState, isEditMode, router, transaction]);

  if (editId && !transaction) {
    return <p className="text-center text-muted-foreground">Loading transaction...</p>;
  }

  if (isScan && !scannedData) {
    return <p className="text-center text-muted-foreground">Scanning receipt...</p>;
  }

  const handleReceiptScan = (data) => {
    if (data) {
      isScan = true;
      console.log("Receipt data:", data);
      setScannedData(data);
    }
  };

  return (
    <>
      <h1 className="text-4xl font-bold mb-6 text-center gradient-title">
        {isEditMode ? "✏️ Edit Transaction" : "➕ Add New Transaction"}
      </h1>

      <form action={formAction} className="space-y-6 max-w-2xl mx-auto">
        {!isEditMode && <ReceiptScanner onScanComplete={handleReceiptScan} />}

        {/* Type */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Type</label>
          <Select name="type" value={type} onValueChange={setType}>  {/* making select a controlled component */}
          {/* cause while setting default values , default values gets set before we get scanned data hence store wrong data */}

          {/* EX: <Select name="type" defaultValue={scannedData ? "EXPENSE" : "INCOME"}>...</Select>
           If scannedData is null when the component renders (which it is initially), the select will default to "INCOME".
           Even after scannedData becomes available later, the defaultValue won’t update — the select remains stuck. */}
            <SelectTrigger>
              <SelectValue placeholder="Select type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INCOME">Income</SelectItem>
              <SelectItem value="EXPENSE">Expense</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Amount & Account */}
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Amount</label>
            <Input
              name="amount"
              type="number"
              defaultValue={transaction?.amount ?? scannedData?.amount}
            />
            {formState.errors?.amount && (
              <p className="text-sm text-red-500">{formState.errors.amount}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Account</label>
            <Select name="accountId" defaultValue={transaction?.accountId}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((acc) => (
                  <SelectItem
                    key={acc.id}
                    value={acc.id}
                    disabled={isEditMode && acc.id !== transaction?.accountId}
                  >
                    {acc.name} (${parseFloat(acc.balance).toFixed(2)})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {formState.errors?.accountId && (
              <p className="text-sm text-red-500">{formState.errors.accountId}</p>
            )}
          </div>
        </div>

        {/* Category */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Category</label>
          <Select name="category" value={selectedCategory} onValueChange={setSelectedCategory}> {/* making select a controlled component */}
            <SelectTrigger>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {category.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {formState.errors?.category && (
            <p className="text-sm text-red-500">{formState.errors.category}</p>
          )}
        </div>

        {/* Date */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Date</label>
          <Input
            name="date"
            type="date"
            defaultValue={
              transaction?.date
                ? new Date(transaction.date).toISOString().split("T")[0]
                : scannedData?.date
                ? new Date(scannedData.date).toISOString().split("T")[0]
                : ""
            }
          />
          {formState.errors?.date && (
            <p className="text-sm text-red-500">{formState.errors.date}</p>
          )}
        </div>

        {/* Note */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Note (optional)</label>
          <Textarea
            name="description"
            defaultValue={transaction?.description ?? scannedData?.description}
          />
        </div>

        {/* Recurring Toggle */}
        <div className="flex items-center justify-between border p-4 rounded-lg">
          <div className="space-y-0.5">
            <label className="text-base font-medium">Recurring Transaction</label>
            <p className="text-sm text-muted-foreground">Repeat this every day/week/month etc.</p>
          </div>
          <Switch
            name="isRecurring"
            checked={isRecurring}
            onCheckedChange={(checked) => setIsRecurring(checked)}
          />
        </div>

        {/* Recurring Interval */}
        {isRecurring && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Recurring Interval</label>
            <Select
              name="recurringInterval"
              defaultValue={transaction?.recurringInterval || "MONTHLY"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select interval" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DAILY">Daily</SelectItem>
                <SelectItem value="WEEKLY">Weekly</SelectItem>
                <SelectItem value="MONTHLY">Monthly</SelectItem>
                <SelectItem value="YEARLY">Yearly</SelectItem>
              </SelectContent>
            </Select>
            {formState.errors?.recurringInterval && (
              <p className="text-sm text-red-500">
                {formState.errors.recurringInterval}
              </p>
            )}
          </div>
        )}

        {/* Submit Button */}
        <Button type="submit" disabled={isPending} className="w-full text-base font-semibold">
          {isEditMode ? "Update Transaction" : "Add Transaction"}
        </Button>
      </form>
    </>
  );
}
