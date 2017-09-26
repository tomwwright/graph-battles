let data = {
  a: 1,
  b: 2
};

let obj = {
  ...data,
  get time() {
    return Date.now();
  }
};

console.log(obj);
