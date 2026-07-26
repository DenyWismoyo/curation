export type SharePayload = {
  title: string;
  text: string;
  url: string;
  successCopyMessage?: string;
};

export const shareOrCopy = async ({
  title,
  text,
  url,
  successCopyMessage = 'Tautan berhasil disalin.',
}: SharePayload): Promise<'shared' | 'copied'> => {
  const payload = { title, text, url };

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(payload);
      return 'shared';
    } catch {
      // Fallback to clipboard when user agent cancels or share target unavailable.
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
  }

  return 'copied';
};
