import { clone, sum, intersection, include, exclude, excludeAll, unique, clamp, collect, contains, flat } from "models/utils";
import { expect } from 'chai';
import { describe, it, beforeEach } from "mocha";

import testMapData from "models/test/testMap";
import combatTestMapData from "models/test/testMap";

describe('Utils', () => {

  it('clone', () => {
    const original = {
      array: [1, 2, 3, 4],
      object: {
        array: [5, 6, 7],
        string: 'a',
        number: 7,
        object: {
          string: 'c'
        }
      },
      string: 'b',
      number: 4
    };
    const cloned = clone(original);

    expect(cloned).to.deep.equal(original);
    expect(cloned).to.not.equal(original);
  });

  it('sum', () => {
    expect(sum([1, 2, 3])).to.equal(6);
    expect(sum([])).to.equal(0);
    expect(sum([5])).to.equal(5);
  });

  it('clamp', () => {
    expect(clamp(5, 1, 10)).to.equal(5);
    expect(clamp(-1, 1, 10)).to.equal(1);
    expect(clamp(11, 1, 10)).to.equal(10);
  });

  it('collect', () => {
    expect(collect(1, 2, 3)).to.have.members([1, 2, 3]);
    expect(collect()).to.have.members([]);
  });

  it('contains', () => {
    expect(contains([1, 2, 3], 4)).to.be.false;
    expect(contains([], 1)).to.be.false;
    expect(contains([1, 2, 3], 3)).to.be.true;
  });

  it('exclude', () => {
    expect(exclude([1, 2, 3], 3)).to.have.members([1, 2]);
    expect(exclude([1, 2, 3], 2)).to.have.members([1, 3]);
    expect(exclude([1, 2, 3, 2, 4], 2)).to.have.members([1, 3, 4]);
    expect(exclude([1, 2, 3], 4)).to.have.members([1, 2, 3]);
    expect(exclude([1, 2, null, 3], 2)).to.have.members([1, null, 3]);

    const original = [1, 2, 3];
    const excluded = exclude(original, 1);
    expect(original).to.not.equal(excluded);
    expect(original).to.have.members([1, 2, 3]);
  });

  it('excludeAll', () => {
    expect(excludeAll([1, 2, 3], [3, 3])).to.have.members([1, 2]);
    expect(excludeAll([1, 2, 3], [2, 3])).to.have.members([1]);
    expect(excludeAll([1, 2, 3, 2, 4], [2, 5])).to.have.members([1, 3, 4]);
    expect(excludeAll([1, 2, 3], [5, 6])).to.have.members([1, 2, 3]);
    expect(excludeAll([1, 2, null, 3], [2])).to.have.members([1, null, 3]);

    const original = [1, 2, 3];
    const excluded = excludeAll(original, [1, 2]);
    expect(original).to.not.equal(excluded);
    expect(original).to.have.members([1, 2, 3]);
  });

  it('unique', () => {
    expect(unique([1, 2, 3, 4])).to.have.members([1, 2, 3, 4]);
    expect(unique([1, 2, 2, 3, 3, 4])).to.have.members([1, 2, 3, 4]);
    expect(unique([1, null, 2, null, 3, 3, 4])).to.have.members([1, null, 2, 3, 4]);
  });

  it('intersection', () => {
    expect(intersection(
      [1, 2, 3, 4],
      [2, 3, 4, 5],
      [3, 4, 5, 6]
    )).to.have.members([3, 4]);
    expect(intersection(
      [null, 2, 3, 4],
      [2, 3, 4, null],
      [3, 4, null, 6]
    )).to.have.members([3, 4, null]);
    expect(intersection(
      [1, 2, 3]
    )).to.have.members([1, 2, 3]);
    expect(intersection(
      [1, 2, 3],
      [4, 5, 6]
    )).to.have.members([]);
    expect(intersection(
      [1, 2, 3],
      []
    )).to.have.members([]);
  });

  it('flat', () => {
    expect(flat([
      [1, 2, 3],
      4,
      [
        [5, 6],
        [7],
        [8, 9, 10],
        11
      ]
    ])).to.have.members([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  })
});


