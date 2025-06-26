"use client";

import { useState, useEffect, useActionState } from "react";
import { useFormState } from "react-dom";
import { CreateAccount } from "@/actions/dashboard"; // server action
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

// ...import UI components (Drawer, Input, etc.)

const AccountDrawer = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [accountType, setAccountType] = useState("");
  const [isDefault, setIsDefault] = useState(false);

  const initialState = { success: null, errors: {} };
const [formState, formAction, isPending] = useActionState(CreateAccount, initialState);

  // Toasts based on form submission
useEffect(() => {
  if (formState?.success) {
    toast.success("Account created successfully!");
    setOpen(false);

    // ✅ Reset form state
    setAccountType("");
    setIsDefault(false);
    formState.errors = {}; // Soft reset to avoid ghost toasts
  } else if (formState?.errors && Object.keys(formState.errors).length > 0) {
    toast.error(" Errors in form.");
  }
}, [formState]);


  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Create New Account</DrawerTitle>
        </DrawerHeader>

        <div className="px-4 pb-4">
          <form action={formAction} className="space-y-4">
            <div>
              <label htmlFor="name" className="text-sm font-medium">Account Name</label>
              <Input name="name" placeholder="e.g., Main Checking" />
              {formState?.errors?.name && (
                <p className="text-sm text-red-500">{formState.errors.name}</p>
              )}
            </div>

            <div>
              <label htmlFor="type" className="text-sm font-medium">Account Type</label>
              <Select onValueChange={(selectedValue) => setAccountType(selectedValue)}>
                {/* Shorthand : <Select onValueChange={setAccountType} /> */}
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {/* //AccountType is enum */}
                  <SelectItem value="CURRENT">Current</SelectItem>  
                  <SelectItem value="SAVINGS">Savings</SelectItem>
                </SelectContent>
              </Select>
              {/* we are passing this followig data in form data with namme type which holds selected value */}
              <input type="hidden" name="type" value={accountType} /> 
              {formState?.errors?.type && (
                <p className="text-sm text-red-500">{formState.errors.type}</p>
              )}
            </div>

            <div>
              <label htmlFor="balance" className="text-sm font-medium">Initial Balance</label>
              <Input name="balance" type="number" step="0.01" placeholder="0.00" />
              {formState?.errors?.balance && (
                <p className="text-sm text-red-500">{formState.errors.balance}</p>
              )}
            </div>

            <div className="flex items-center justify-between border p-3 rounded-lg">
              <div>
                <label htmlFor="isDefault" className="text-base font-medium">Set as Default</label>
                <p className="text-sm text-muted-foreground">
                  This account will be selected by default for transactions.
                </p>
              </div>
              <Switch checked={isDefault} onCheckedChange={(checkedValue) => {setIsDefault(checkedValue)}} />
                {/* checkedValue is a boolean (true or false). It tells you whether the Switch is ON (true) or OFF (false). */}
              <input type="hidden" name="isDefault" value={isDefault ? "on" : ""} />
            </div>

            <div className="flex gap-4 pt-4">
              <DrawerClose asChild>
                <Button type="button" variant="outline" className="flex-1">
                  Cancel
                </Button>
              </DrawerClose>
             <Button type="submit" className="flex-1" disabled={isPending}>
               {isPending ? "Creating..." : "Create Account"}
             </Button>

            </div>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default AccountDrawer;
