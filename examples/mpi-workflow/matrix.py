#!/usr/bin/env python3

import socket
import sys

import numpy as np
from mpi4py import MPI


def parse_positive(args, index, default):
    if len(args) <= index:
        return default
    try:
        value = int(args[index])
        return value if value > 0 else default
    except ValueError:
        return default


def row_partition(n, workers, rank):
    base = n // workers
    remainder = n % workers
    row_count = base + (1 if rank < remainder else 0)
    row_start = rank * base + min(rank, remainder)
    return row_start, row_count


def main() -> int:
    comm = MPI.COMM_WORLD
    rank = comm.Get_rank()
    workers = comm.Get_size()

    matrix_size = parse_positive(sys.argv, 1, 1024)
    repeats = parse_positive(sys.argv, 2, 3)
    row_start, row_count = row_partition(matrix_size, workers, rank)

    n = matrix_size
    rows = row_count
    i = np.arange(row_start, row_start + rows, dtype=np.int64)[:, None]
    j = np.arange(n, dtype=np.int64)[None, :]
    a = ((i * n + j + 3) % 97).astype(np.float64) / 97.0
    b_indices = np.arange(n * n, dtype=np.int64).reshape(n, n)
    b = ((b_indices + 11) % 89).astype(np.float64) / 89.0

    if rank == 0:
        print(f"Workers: {workers}")
        print(f"Benchmark: strong-scaling matrix multiply (N={matrix_size}, repeats={repeats})")
    print(f"Rank {rank} on host {socket.gethostname()} rows=[{row_start},{row_start + row_count})")

    comm.Barrier()

    for iteration in range(1, repeats + 1):
        start = MPI.Wtime()
        c = a @ b
        elapsed = MPI.Wtime() - start

        local_checksum = float(np.sum(c, dtype=np.float64))
        cluster_checksum = comm.reduce(local_checksum, op=MPI.SUM, root=0)
        max_elapsed = comm.reduce(elapsed, op=MPI.MAX, root=0)

        if rank == 0:
            global_flops = 2.0 * float(matrix_size) * float(matrix_size) * float(matrix_size)
            cluster_gflops = global_flops / max(max_elapsed, 1e-9) / 1e9
            print(
                f"Iteration {iteration}/{repeats} max-rank-time={max_elapsed:.3f}s "
                f"cluster-throughput={cluster_gflops:.2f} GFLOP/s checksum={cluster_checksum:.6e}"
            )

    comm.Barrier()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
