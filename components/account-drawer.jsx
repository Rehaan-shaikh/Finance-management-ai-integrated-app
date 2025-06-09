"use client";

import { useState, useEffect } from "react";
import { useActionState } from "react";
import { CreateAccount } from "@/actions/dashboard";

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
import { toast } from "sonner";

const AccountDrawer = ({ children }) => {
  const [open, setOpen] = useState(false);
  const [accountType, setAccountType] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [loading, setLoading] = useState(false);

const [formState, formAction] = useActionState(async (prevState, formData) => {
  setLoading(true);
  const result = await CreateAccount(prevState, formData);
  setLoading(false);

  if (result?.success) {
    toast.success("Account created successfully!");
    setOpen(false); // Close drawer on success
  } else if (result?.errors) {
    toast.error("Failed to create account. Please check the form.");
  } else {
    toast.error("Something went wrong. Try again.");
  }

  return result;
}, {});

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Create New Account</DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-4">
          <form className="space-y-4" action={formAction}>
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Account Name
              </label>
              <Input name="name" placeholder="e.g., Main Checking" />
              {formState?.errors?.name && (
                <p className="text-sm text-red-500">{formState.errors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="type" className="text-sm font-medium">
                Account Type
              </label>
              <Select onValueChange={setAccountType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CURRENT">Current</SelectItem>
                  <SelectItem value="SAVINGS">Savings</SelectItem>
                </SelectContent>
              </Select>
              <input type="hidden" name="type" value={accountType} />
              {formState?.errors?.type && (
                <p className="text-sm text-red-500">{formState.errors.type}</p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="balance" className="text-sm font-medium">
                Initial Balance
              </label>
              <Input name="balance" type="number" step="0.01" placeholder="0.00" />
              {formState?.errors?.balance && (
                <p className="text-sm text-red-500">{formState.errors.balance}</p>
              )}
            </div>

            <div className="flex items-center justify-between border p-3 rounded-lg">
              <div className="space-y-0.5">
                <label htmlFor="isDefault" className="text-base font-medium">
                  Set as Default
                </label>
                <p className="text-sm text-muted-foreground">
                  This account will be selected by default for transactions.
                </p>
              </div>
              <Switch checked={isDefault} onCheckedChange={setIsDefault} />
              <input
                type="hidden"
                name="isDefault"
                value={isDefault ? "on" : "" }
              />
            </div>

            <div className="flex gap-4 pt-4">
              <DrawerClose asChild>
                <Button type="button" variant="outline" className="flex-1" disabled={loading}>
                  Cancel
                </Button>
              </DrawerClose>
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading ? (
  <span className="flex items-center justify-center gap-2">
    <Loader2 className="animate-spin h-4 w-4" />
    Creating...
  </span>
) : (
  "Create Account"
)}

              </Button>
            </div>
          </form>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default AccountDrawer;