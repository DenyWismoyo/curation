export const withRetry = async <T>(fn: () => Promise<T>, retries = 4, delayMs = 3000): Promise<T> => {
  try { return await fn(); }
  catch (error: any) {
    if (error.status === 400 || (error.message && error.message.includes('SAFETY'))) throw error;
    if (retries <= 1) throw error;
    
    console.warn(`[API sibuk/Error JSON] Mencoba ulang. Sisa percobaan: ${retries - 1}...`);
    await new Promise(res => setTimeout(res, delayMs));
    return withRetry(fn, retries - 1, delayMs * 2);
  }
};
