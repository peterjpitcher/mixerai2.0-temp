import { fetchUsersPaginated } from '@/app/dashboard/users/fetch-users';

type FakeUser = { id: string };

const buildResponse = (users: FakeUser[], total?: number) => ({
  success: true,
  data: users,
  pagination: { total },
});

describe('fetchUsersPaginated', () => {
  it('aggregates pages until final chunk is smaller than page size', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(buildResponse([{ id: '1' }, { id: '2' }], 3))
      .mockResolvedValueOnce(buildResponse([{ id: '3' }], 3));

    const result = await fetchUsersPaginated<FakeUser>({
      fetchPage,
      perPage: 2,
      includeInactive: true,
    });

    expect(result.users).toHaveLength(3);
    expect(result.error).toBeNull();
    expect(fetchPage).toHaveBeenCalledTimes(2);
    expect(fetchPage).toHaveBeenNthCalledWith(
      1,
      '/api/users?page=1&pageSize=2&includeInactive=true',
      expect.any(Object)
    );
    expect(fetchPage).toHaveBeenNthCalledWith(
      2,
      '/api/users?page=2&pageSize=2&includeInactive=true',
      expect.any(Object)
    );
  });

  it('stops fetching when API reports an error and returns partial data', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(buildResponse([{ id: '1' }, { id: '2' }], 4))
      .mockResolvedValueOnce({ success: false, error: 'nope' });

    const result = await fetchUsersPaginated<FakeUser>({
      fetchPage,
      perPage: 2,
    });

    expect(result.users).toEqual([{ id: '1' }, { id: '2' }]);
    expect(result.error).toBe('nope');
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('returns the thrown error message and stops pagination', async () => {
    const fetchPage = jest
      .fn()
      .mockResolvedValueOnce(buildResponse([{ id: '1' }, { id: '2' }], 4))
      .mockRejectedValueOnce(new Error('network down'));

    const result = await fetchUsersPaginated<FakeUser>({
      fetchPage,
      perPage: 2,
    });

    expect(result.users).toEqual([{ id: '1' }, { id: '2' }]);
    expect(result.error).toBe('network down');
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('marks result as aborted when signal is already aborted before fetching', async () => {
    const controller = new AbortController();
    controller.abort();

    const fetchPage = jest.fn();
    const result = await fetchUsersPaginated<FakeUser>({
      fetchPage,
      signal: controller.signal,
    });

    expect(result.users).toEqual([]);
    expect(result.error).toBeNull();
    expect(result.aborted).toBe(true);
    expect(fetchPage).not.toHaveBeenCalled();
  });
});
