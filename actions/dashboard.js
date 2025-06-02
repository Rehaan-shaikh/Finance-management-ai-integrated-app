'use server';
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/dist/types/server";
import { revalidatePath } from "next/cache";


const serializeTransaction = (obj) => {
  const serialized = { ...obj };
  if (obj.balance) {
    serialized.balance = obj.balance.toNumber();
  }
  if (obj.amount) {
    serialized.amount = obj.amount.toNumber();
  }
  return serialized;
};


export const CreateAccount = async (data) => {
    const user = await auth();
    try {
        if (!user) {
        throw new Error("User not authenticated");
    }
    const User = await db.user.findUnique({
        where: {
            clerkId: user.userId,
        },
    });

    const { name, type , balance , isDefault } = data;
    const balanceFloat = parseFloat(balance);
    if (isNaN(balanceFloat)) {
        throw new Error("Invalid balance value");
    }

    const existingAccount = await db.account.findFirst({
        where: {
            userId : User.id,
        }
    });

    const defaultAcc = existingAccount.length===0 ? true : isDefault; 

    if (defaultAcc){
        await db.account.updateMany({
            where: {
                userId: User.id,
                isDefault: true,
            },
            data: {
                isDefault: false,
            },
        });
    }

    const account = await db.account.create({
        data: {
            ...data,
            balance: balanceFloat,
            isDefault : defaultAcc,
            userId: User.id        
}})

    const serializedAccount = serializeTransaction(account);
    revalidatePath('/dashboard');
    return {success:true, data: serializedAccount};

    } catch (error) {
        throw new Error(error.message || "Failed to create account");
        
    }
}