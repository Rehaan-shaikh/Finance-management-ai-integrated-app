"use client";

import { useState, useRef, useEffect } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { CalendarIcon, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import { cn } from "@/lib/utils";
import { createTransaction } from "@/actions/transaction";
import { ReceiptScanner } from "./recipt-scanner";

export function AddTransactionForm({ accounts, categories }) {
  const router = useRouter();
  const initialState = { message: null };

  const [state, formAction] = useActionState(createTransaction, initialState);
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [date, setDate] = useState(new Date());
  const [selectedType, setSelectedType] = useState("EXPENSE");

  const amountRef = useRef(null);
  const descriptionRef = useRef(null);

  const defaultAccountId = accounts.find((ac) => ac.isDefault)?.id || "";

  const handleSuccess = () => {
    toast.success("Transaction created successfully!");
    router.push(`/account/${state.data.accountId}`);
  };

  useEffect(() => {
    if (state?.success) handleSuccess();
    else if (state?.error) {
      toast.error(state.error.message || "Failed to create transaction");
    }
  }, [state]);

  const handleScan = (data) => {
    if (!data || Object.keys(data).length === 0) {
      toast.error("Could not extract data from the image.");
      return;
    }

    if (amountRef.current) amountRef.current.value = data.amount;
    if (descriptionRef.current) descriptionRef.current.value = data.description;

    // Set matching category ID
    const match = categories.find((cat) =>
      cat.name.toLowerCase() === data.category.toLowerCase()
    );
    if (match) setSelectedCategory(match.id);

    if (data.date) setDate(new Date(data.date));
  };

  return (
    <form action={formAction} className="space-y-6">
      {/* Receipt Scan */}
      <ReceiptScanner onScanComplete={handleScan} />

      {/* Type */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Type</label>
        <Select name="type" value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger>
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EXPENSE">Expense</SelectItem>
            <SelectItem value="INCOME">Income</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Amount and Account */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label className="text-sm font-medium">Amount</label>
          <Input
            ref={amountRef}
            type="number"
            step="0.01"
            name="amount"
            placeholder="0.00"
            required
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Account</label>
          <Select name="accountId" defaultValue={defaultAccountId}>
            <SelectTrigger>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.name} (${parseFloat(acc.balance).toFixed(2)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Category */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Category</label>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Hidden field for form submission */}
        <input type="hidden" name="category" value={selectedCategory} />
      </div>

      {/* Date Picker */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Date</label>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full pl-3 text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              {date ? format(date, "PPP") : <span>Pick a date</span>}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              disabled={(d) =>
                d > new Date() || d < new Date("1900-01-01")
              }
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <input type="hidden" name="date" value={date.toISOString()} />
      </div>

      {/* Description */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Input
          name="description"
          ref={descriptionRef}
          placeholder="Enter description"
        />
      </div>

      {/* Recurring Toggle */}
      <div className="flex items-center justify-between border p-4 rounded-lg">
        <div className="space-y-0.5">
          <label className="text-base font-medium">Recurring Transaction</label>
          <p className="text-sm text-muted-foreground">
            Set up a recurring schedule
          </p>
        </div>
        <Switch
          checked={isRecurring}
          onCheckedChange={setIsRecurring}
        />
        <input type="hidden" name="isRecurring" value={isRecurring ? "true" : ""} />
      </div>

      {/* Recurring Interval */}
      {isRecurring && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Recurring Interval</label>
          <Select name="recurringInterval">
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
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-4">
        <Button
          type="button"
          variant="outline"
          className="flex-1"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" className="flex-1">
          {state?.pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Transaction"
          )}
        </Button>
      </div>
    </form>
  );
}
