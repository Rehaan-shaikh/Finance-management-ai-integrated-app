import { seedTransactions } from "@/actions/seed";

export async function GET() {
  const result =  await seedTransactions();
  return Response.json(result);
}

// Your GET route calls seedTransactions(), which:
// Generates 90 days of fake transactions.
// Clears existing transactions for the account
// Inserts the new fake transactions into your database using Prisma.
// Updates the account balance based on those transactions.
// All this happens in one atomic Prisma transaction (db.$transaction).