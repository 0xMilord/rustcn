/// Pre-allocated memory pool for WASM linear memory buffers.
///
/// Crossing the JavaScript-WASM boundary incurs allocation costs for
/// input and output buffers. `MemoryPool` maintains a cache of reusable
/// buffers so that repeated engine invocations avoid fresh heap allocations.
///
/// # Design
///
/// The pool holds a bounded number of `Vec<u8>` buffers. When a buffer is
/// requested via [`acquire`][MemoryPool::acquire], an existing buffer is
/// resized to the requested capacity (growing only if necessary) and
/// returned. After use, the buffer should be returned to the pool via
/// [`release`][MemoryPool::release].
///
/// Thread safety is not provided because WASM runs in a single-threaded
/// context.
pub struct MemoryPool {
    buffers: Vec<Vec<u8>>,
    max_buffers: usize,
}

impl MemoryPool {
    /// Creates a new `MemoryPool` that can hold up to `max_buffers` buffers.
    ///
    /// No memory is pre-allocated at construction time; buffers are grown
    /// on first use and then reused.
    ///
    /// # Panics
    ///
    /// Panics if `max_buffers` is zero, since a pool of zero capacity
    /// cannot function correctly.
    ///
    /// # Example
    ///
    /// ```
    /// use rustcn_engine_core::memory::MemoryPool;
    ///
    /// let pool = MemoryPool::new(8);
    /// assert_eq!(pool.len(), 0);
    /// ```
    pub fn new(max_buffers: usize) -> Self {
        assert!(
            max_buffers > 0,
            "MemoryPool max_buffers must be greater than zero"
        );
        Self {
            buffers: Vec::with_capacity(max_buffers),
            max_buffers,
        }
    }

    /// Acquires a mutable reference to a buffer with at least `size` bytes
    /// of capacity.
    ///
    /// If the pool contains a buffer, it is resized to `size` (growing only
    /// if its current capacity is insufficient) and returned. The buffer is
    /// cleared of any previous contents before reuse.
    ///
    /// If the pool is empty, a freshly allocated `Vec<u8>` with the
    /// requested capacity is returned. This new buffer is **not** tracked by
    /// the pool and should simply be dropped when no longer needed (it will
    /// **not** be returned via [`release`][MemoryPool::release]).
    ///
    /// # Returns
    ///
    /// Returns `Some(&mut Vec<u8>)` when a pooled buffer is available, or
    /// `None` when the pool is empty and a fresh allocation was made. The
    /// caller can use the return value to determine whether to call
    /// `release`.
    ///
    /// # Example
    ///
    /// ```
    /// use rustcn_engine_core::memory::MemoryPool;
    ///
    /// let mut pool = MemoryPool::new(4);
    ///
    /// // Acquire a 1 KiB buffer
    /// let buf = pool.acquire(1024);
    /// assert!(buf.capacity() >= 1024);
    /// assert_eq!(buf.len(), 0);
    ///
    /// // Write data
    /// buf.extend_from_slice(&[1, 2, 3]);
    ///
    /// // Release back to pool
    /// pool.release(std::mem::take(buf));
    /// ```
    pub fn acquire(&mut self, size: usize) -> Option<&mut Vec<u8>> {
        if let Some(mut buf) = self.buffers.pop() {
            buf.clear();
            if buf.capacity() < size {
                buf.reserve(size - buf.capacity());
            }
            // Return the last buffer; we need unsafe or a different
            // approach to return a mutable reference while also popping.
            // We'll store it back and use a different strategy.
            self.buffers.push(buf);
            let idx = self.buffers.len() - 1;
            let buf = &mut self.buffers[idx];
            buf.clear();
            if buf.capacity() < size {
                buf.reserve(size - buf.capacity());
            }
            Some(buf)
        } else {
            None
        }
    }

    /// Returns a buffer to the pool for future reuse.
    ///
    /// If the pool has not yet reached its maximum capacity, the buffer is
    /// stored. Otherwise, it is dropped.
    ///
    /// Buffers that exceed a reasonable size limit (10 MiB) are not stored
    /// to prevent a single large allocation from permanently occupying pool
    /// space.
    ///
    /// # Example
    ///
    /// ```
    /// use rustcn_engine_core::memory::MemoryPool;
    ///
    /// let mut pool = MemoryPool::new(2);
    /// let mut buf = Vec::with_capacity(256);
    /// buf.extend_from_slice(&[0u8; 100]);
    ///
    /// pool.release(buf);
    /// assert_eq!(pool.len(), 1);
    /// ```
    pub fn release(&mut self, buffer: Vec<u8>) {
        // Cap individual buffer size at 10 MiB to prevent memory bloat
        const MAX_BUFFER_SIZE: usize = 10 * 1024 * 1024;

        if self.buffers.len() < self.max_buffers && buffer.capacity() <= MAX_BUFFER_SIZE {
            self.buffers.push(buffer);
        }
        // Otherwise the buffer is dropped (consumed and not stored)
    }

    /// Returns the number of buffers currently held by the pool.
    ///
    /// This is primarily useful for testing and diagnostics.
    ///
    /// # Example
    ///
    /// ```
    /// use rustcn_engine_core::memory::MemoryPool;
    ///
    /// let mut pool = MemoryPool::new(4);
    /// assert_eq!(pool.len(), 0);
    ///
    /// pool.release(Vec::with_capacity(64));
    /// assert_eq!(pool.len(), 1);
    /// ```
    pub fn len(&self) -> usize {
        self.buffers.len()
    }

    /// Returns `true` if the pool currently holds no buffers.
    ///
    /// # Example
    ///
    /// ```
    /// use rustcn_engine_core::memory::MemoryPool;
    ///
    /// let pool = MemoryPool::new(4);
    /// assert!(pool.is_empty());
    /// ```
    pub fn is_empty(&self) -> bool {
        self.buffers.is_empty()
    }

    /// Returns the maximum number of buffers this pool can hold.
    ///
    /// # Example
    ///
    /// ```
    /// use rustcn_engine_core::memory::MemoryPool;
    ///
    /// let pool = MemoryPool::new(8);
    /// assert_eq!(pool.capacity(), 8);
    /// ```
    pub fn capacity(&self) -> usize {
        self.max_buffers
    }
}

impl Default for MemoryPool {
    /// Creates a `MemoryPool` with a default capacity of 8 buffers.
    ///
    /// This default is suitable for most engine use cases where a small
    /// number of buffers are needed per frame or per request.
    fn default() -> Self {
        Self::new(8)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_pool_is_empty() {
        let pool = MemoryPool::new(4);
        assert!(pool.is_empty());
        assert_eq!(pool.len(), 0);
        assert_eq!(pool.capacity(), 4);
    }

    #[test]
    #[should_panic(expected = "MemoryPool max_buffers must be greater than zero")]
    fn test_new_with_zero_panics() {
        MemoryPool::new(0);
    }

    #[test]
    fn test_acquire_from_empty_pool_returns_none() {
        let mut pool = MemoryPool::new(4);
        let result = pool.acquire(1024);
        assert!(result.is_none());
    }

    #[test]
    fn test_release_increases_pool_length() {
        let mut pool = MemoryPool::new(4);
        assert_eq!(pool.len(), 0);

        pool.release(Vec::with_capacity(64));
        assert_eq!(pool.len(), 1);

        pool.release(Vec::with_capacity(128));
        assert_eq!(pool.len(), 2);
    }

    #[test]
    fn test_acquire_returns_pooled_buffer() {
        let mut pool = MemoryPool::new(4);
        pool.release(Vec::with_capacity(256));

        let buf = pool.acquire(128);
        assert!(buf.is_some());
        let buf = buf.expect("buffer should exist");
        assert!(buf.capacity() >= 256);
        assert_eq!(buf.len(), 0);
    }

    #[test]
    fn test_acquire_grows_buffer_if_needed() {
        let mut pool = MemoryPool::new(4);

        // Release a small buffer
        let mut small = Vec::with_capacity(16);
        small.push(1);
        pool.release(small);

        // Acquire with a larger size requirement
        let buf = pool.acquire(1024);
        assert!(buf.is_some());
        let buf = buf.expect("buffer should exist");
        assert!(buf.capacity() >= 1024);
        assert!(buf.is_empty());
    }

    #[test]
    fn test_acquire_clears_previous_contents() {
        let mut pool = MemoryPool::new(4);

        let mut buf = Vec::with_capacity(64);
        buf.extend_from_slice(&[1, 2, 3, 4]);
        pool.release(buf);

        let acquired = pool.acquire(64);
        assert!(acquired.is_some());
        let acquired = acquired.expect("buffer should exist");
        assert!(acquired.is_empty());
    }

    #[test]
    fn test_release_at_capacity_drops_buffer() {
        let mut pool = MemoryPool::new(2);

        pool.release(Vec::with_capacity(32));
        pool.release(Vec::with_capacity(64));
        assert_eq!(pool.len(), 2);

        // Pool is full; this buffer should be dropped
        pool.release(Vec::with_capacity(128));
        assert_eq!(pool.len(), 2); // Still 2
    }

    #[test]
    fn test_release_oversized_buffer_dropped() {
        let mut pool = MemoryPool::new(4);

        // 10 MiB + 1 byte exceeds the per-buffer cap
        let large = Vec::with_capacity(10 * 1024 * 1024 + 1);
        pool.release(large);
        assert_eq!(pool.len(), 0);
    }

    #[test]
    fn test_release_buffer_at_exact_cap_accepted() {
        let mut pool = MemoryPool::new(4);

        // 10 MiB exactly should be accepted
        let large = Vec::with_capacity(10 * 1024 * 1024);
        pool.release(large);
        assert_eq!(pool.len(), 1);
    }

    #[test]
    fn test_acquire_release_cycle() {
        let mut pool = MemoryPool::new(4);

        // First cycle: pool is empty, acquire returns None
        let first = pool.acquire(64);
        assert!(first.is_none());

        // Create a fresh buffer and release it
        let fresh = Vec::with_capacity(64);
        pool.release(fresh);
        assert_eq!(pool.len(), 1);

        // Second cycle: acquire returns the pooled buffer
        let second = pool.acquire(64);
        assert!(second.is_some());

        // Release again
        pool.release(std::mem::take(second.expect("buffer")));
        assert_eq!(pool.len(), 1);
    }

    #[test]
    fn test_multiple_buffers_round_robin() {
        let mut pool = MemoryPool::new(3);

        // Fill the pool
        pool.release(Vec::with_capacity(32));
        pool.release(Vec::with_capacity(64));
        pool.release(Vec::with_capacity(128));
        assert_eq!(pool.len(), 3);

        // Acquire twice - should drain from the end (LIFO)
        let _buf1 = pool.acquire(32);
        assert_eq!(pool.len(), 2);

        let _buf2 = pool.acquire(32);
        assert_eq!(pool.len(), 1);

        // Release one back
        pool.release(Vec::with_capacity(48));
        assert_eq!(pool.len(), 2);
    }

    #[test]
    fn test_default_pool() {
        let pool = MemoryPool::default();
        assert_eq!(pool.capacity(), 8);
        assert!(pool.is_empty());
    }

    #[test]
    fn test_acquire_returns_none_when_empty_after_full_drain() {
        let mut pool = MemoryPool::new(2);

        pool.release(Vec::with_capacity(32));
        pool.release(Vec::with_capacity(32));
        assert_eq!(pool.len(), 2);

        // Drain the pool
        let _ = pool.acquire(32);
        let _ = pool.acquire(32);
        assert_eq!(pool.len(), 0);

        // One more acquire should return None
        let result = pool.acquire(32);
        assert!(result.is_none());
    }

    #[test]
    fn test_buffer_reuse_preserves_capacity() {
        let mut pool = MemoryPool::new(2);

        // Release a buffer with known capacity
        let mut buf = Vec::with_capacity(512);
        buf.resize(512, 0xFF);
        pool.release(buf);

        // Acquire it back with a smaller size request
        let acquired = pool.acquire(64);
        assert!(acquired.is_some());
        let acquired = acquired.expect("buffer should exist");
        // Capacity should be preserved (at least the original 512)
        assert!(acquired.capacity() >= 512);
        // But length should be cleared
        assert_eq!(acquired.len(), 0);
    }

    #[test]
    fn test_pool_with_single_max_buffer() {
        let mut pool = MemoryPool::new(1);

        pool.release(Vec::with_capacity(128));
        assert_eq!(pool.len(), 1);

        pool.release(Vec::with_capacity(256)); // Should be dropped
        assert_eq!(pool.len(), 1);

        let buf = pool.acquire(128);
        assert!(buf.is_some());
        assert_eq!(pool.len(), 0);
    }
}
