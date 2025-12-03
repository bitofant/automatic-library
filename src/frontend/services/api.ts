import type { LibraryData, Rating, LibrariesResponse } from '../types'

export async function getLibraries(): Promise<LibrariesResponse> {
  const res = await fetch('/libs')
  return res.json()
}

export async function reloadLibraries(): Promise<LibrariesResponse> {
  const res = await fetch('/libs/reload', { method: 'POST' })
  if (!res.ok) throw new Error('Failed to reload libraries')
  return res.json()
}

export async function getLibrary(
  path: string,
  ratings?: Array<1|2|3|4|5> | null,
  includeSubfolders?: boolean
): Promise<LibraryData> {
  // Encode path to handle special characters
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  const params = new URLSearchParams();

  if (ratings && ratings.length > 0) {
    params.append('ratings', ratings.join(','));
  }
  if (includeSubfolders) {
    params.append('recursive', 'true');
  }

  let url = `/libs/${encodedPath}`;
  const queryString = params.toString();
  if (queryString) {
    url += `?${queryString}`;
  }

  const res = await fetch(url);
  return res.json();
}

export async function rateImage(
  libraryPath: string,
  img: string,
  rating: Rating
): Promise<void> {
  const encodedPath = libraryPath.split('/').map(encodeURIComponent).join('/');
  await fetch(`/libs/${encodedPath}/rate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ img, rating })
  })
}

export async function deleteImage(
  libraryPath: string,
  img: string
): Promise<void> {
  const res = await fetch('/libs/delete', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ library: libraryPath, file: img })
  })
  if (!res.ok) {
    throw new Error('Failed to delete image')
  }
}

export async function getVersionTag(longpoll = false): Promise<string> {
  const url = longpoll ? '/version-tag?longpoll=true' : '/version-tag'
  const res = await fetch(url)
  return res.text()
}
