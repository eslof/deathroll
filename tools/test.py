import secrets
import math


def run(sample_size, ceil):
    occurrences = {}
    for _ in range(sample_size):
        match_length = 1
        lowest = ceil
        while lowest > 0:
            lowest = secrets.randbelow(lowest+1)
            match_length += 1

        if match_length not in occurrences:
            occurrences[match_length] = 0
        occurrences[match_length] += 1

    return occurrences


occurrences = run(1000000, 10)
print(sum(occurrences.values()))
for elem in sorted(occurrences.items()):
    print(elem[0], " ::", "{:.3f}".format(100*(elem[1] / 1000000)), "%")
