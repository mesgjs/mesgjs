if (!Set.prototype.union) Set.prototype.union = function union (other) {
    const result = new Set([]);
    for (const v of this.values()) result.add(v);
    for (const v of other.values()) result.add(v);
    return result;
}
