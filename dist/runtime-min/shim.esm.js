Set.prototype.union||(Set.prototype.union=function(n){const o=new Set([]);for(const t of this.values())o.add(t);for(const t of n.values())o.add(t);return o});
