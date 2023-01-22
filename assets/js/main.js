(() => {
  // * Utils
  const range = (start, end) => {
    let length = end - start + 1;
    return Array.from({ length }, (_, idx) => idx + start);
  };

  const shuffle = ([...arr]) => {
    let m = arr.length;
    while (m) {
      const i = Math.floor(Math.random() * m--);
      [arr[m], arr[i]] = [arr[i], arr[m]];
    }
    return arr;
  };

  function parseParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      maxNumber: parseInt(params.get('max'), 10) || 90,
    };
  }

  class Repository {
    save(data) {
      localStorage.setItem('bingo', JSON.stringify(data));
    }
    load() {
      return JSON.parse(localStorage.getItem('bingo'));
    }
  }

  const repository = new Repository();

  const compareWithTen = (a) => {
    return a < 10 ? '0' + a : a;
  };

  // * Init random

  function createRandomSpan() {
    const newDigit = document.createElement('span');
    return newDigit;
  }

  function getRandom(nonZero) {
    return nonZero
      ? Math.floor(Math.random() * 9) + 1
      : Math.floor(Math.random() * 10);
  }

  function createRandomNumbersTo(parentNode) {
    if (!parentNode) {
      throw new Error('Must be a valid parent node');
    }
    return function (
      digits,
      nextDigitTimeGap,
      digitSettledTime,
      valueTens,
      valueUnits
    ) {
      let isValid = (number) => Number.isSafeInteger(+number) && +number > 0;

      if (
        !isValid(digits) ||
        !isValid(nextDigitTimeGap) ||
        !isValid(digitSettledTime)
      ) {
        throw new Error('Arguments must be positive integer');
      }

      if (digitSettledTime <= 10) {
        throw new Error(
          'digitSettledTime must be greater than 10 milliseconds'
        );
      }

      return new Promise((resolve, reject) => {
        function getFinalNumber() {
          parentNode.classList.add('random-resolved');
          let number = parentNode.innerText;
          parentNode.innerHTML = number;
          if (!Number.isSafeInteger(+number)) {
            resolve(BigInt(number));
            return;
          }
          resolve(+number);
        }

        function generateNumber(speed, endTime, value, nonZero = false) {
          let newDigit = createRandomSpan();
          parentNode.prepend(newDigit);
          let digitId = setInterval(() => {
            if (shouldStop()) {
              clearInterval(digitId);
              return;
            }
            endTime -= speed;
            let randomNumber = getRandom(nonZero);
            if (endTime > 300) {
              newDigit.textContent = randomNumber;
              return;
            }
            newDigit.textContent = value;
            newDigit.classList.add('random-resolved');
            clearInterval(digitId);
          }, speed);
        }
        let digit = 1;
        let isLastDigit = () => digit === digits;

        function generateDigit() {
          if (shouldStop()) {
            clearInterval(genRandomNumberId);
            return;
          }
          if (isLastDigit()) {
            generateNumber(10, digitSettledTime, valueTens);
            setTimeout(() => {
              getFinalNumber();
            }, digitSettledTime);
            clearInterval(genRandomNumberId);
            return;
          }
          generateNumber(10, digitSettledTime, valueUnits);
          digit++;
        }

        let genRandomNumberId = setInterval(generateDigit, nextDigitTimeGap);
        generateDigit(); //remove first interval delay
      });
    };
  }

  function prependRandomNumbersTo(selector) {
    if (typeof selector !== 'string' || !selector.length) {
      throw new Error('Selector should be non-empty string');
    }
    const element = document.querySelector(selector);
    return createRandomNumbersTo(element);
  }

  function shouldStop() {
    return stopDice;
  }
  function rollDice(valueTens, valueUnits, callback) {
    stopDice = true;
    let numbers = [...document.querySelectorAll('.number')];
    numbers.forEach((number) => {
      number.textContent = '';
      number.classList.remove('random-resolved');
    });
    setTimeout(() => {
      handler(valueTens, valueUnits, callback);
    }, 1000);
  }

  function handler(valueTens, valueUnits, callback) {
    stopDice = false;
    prependRandomNumbersTo('.rolling-number')(
      2,
      1000,
      1200,
      valueTens,
      valueUnits
    ).then((n) => callback(n));
  }

  // * Handle DOM

  const button = document.getElementById('roll-dice');
  const reload = document.getElementById('reload');
  const loader = document.getElementById('loader');
  const matrixTable = document.getElementById('matrix-table-wrapper');
  const rollingNumber = document.getElementById('rolling-number');

  const { maxNumber } = parseParams();
  let { numbers, selectedCount: initialSelectedCount } =
    repository.load() || {};

  if (
    !Array.isArray(numbers) ||
    numbers.length !== maxNumber ||
    typeof initialSelectedCount !== 'number'
  ) {
    numbers = shuffle(range(1, maxNumber));
    initialSelectedCount = 0;
  } else if (initialSelectedCount > 0) {
    rollingNumber.textContent = compareWithTen(
      numbers[initialSelectedCount - 1]
    );
  }

  setTimeout(() => {
    loader.style.display = 'none';
  }, 1200);

  // * Matrix Table

  const selectedNumbers = () => {
    return numbers.slice(0, initialSelectedCount);
  };

  let innerMatrixTable = '';

  range(1, maxNumber).forEach((value, i) => {
    let classNames = 'matrix-table';
    const selectedNumbersResult = selectedNumbers();
    if (selectedNumbersResult.indexOf(value) >= 0) {
      classNames += ' highlight';
    }
    innerMatrixTable += `<div id="td-${value}" class="${classNames}">${
      value < 10 ? `0${value}` : value
    }</div>`;
  });

  matrixTable.innerHTML = innerMatrixTable;

  // * Handle randomize

  let stopDice = false;
  let loading = false;

  const handleRollDice = () => {
    loading = true;

    let randomNumber = numbers[initialSelectedCount];

    let splittedNumber = randomNumber.toString();

    if (randomNumber < 10) {
      splittedNumber = `0${randomNumber}`;
    }
    splittedNumber = splittedNumber.split('');
    button.classList.add('disabled');
    reload.classList.add('disabled');

    rollDice(splittedNumber[0], splittedNumber[1], (n) => {
      initialSelectedCount += 1;
      repository.save({
        numbers,
        selectedCount: initialSelectedCount,
      });
      tdText = document.getElementById(`td-${n}`);
      if (tdText) {
        tdText.classList.add('highlight');
      }
      loading = false;
      button.classList.remove('disabled');
      reload.classList.remove('disabled');
    });
  };

  const handleReset = () => {
    numbers = shuffle(numbers);
    initialSelectedCount = 0;
    repository.save({
      numbers,
      selectedCount: initialSelectedCount,
    });

    let matrixClone = [...document.querySelectorAll('.matrix-table')];
    matrixClone.forEach((number) => {
      number.classList.remove('highlight');
    });
    rollingNumber.classList.remove('random-resolved');
    rollingNumber.textContent = '00';
  };

  button.addEventListener('click', () => {
    if (loading) return;
    if (initialSelectedCount === maxNumber) {
      let timerInterval;
      Swal.fire({
        title: 'Hết số rồi, tui tự xóa đây!',
        html: 'Tui tự tắt <b></b> giây.',
        icon: 'info',
        timer: 3000,
        timerProgressBar: true,
        didOpen: () => {
          const b = Swal.getHtmlContainer().querySelector('b');
          timerInterval = setInterval(() => {
            b.textContent = Math.round(Swal.getTimerLeft() / 1000);
          }, 100);
        },
        willClose: () => {
          clearInterval(timerInterval);
        },
      }).then(() => {
        handleReset();
      });
    } else {
      handleRollDice();
    }
  });

  const handleReload = () => {
    Swal.fire({
      title: 'Chắc chưa má?',
      text: "Tui mà xóa là mất hết luôn ó!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Làm được không?',
      cancelButtonText: 'Ò, dậy thui',
    }).then((result) => {
      if (result.isConfirmed) {
        handleReset();
        Swal.fire({
          title: 'Xong!',
          text: 'Xóa rồi đó má',
          icon: 'success',
        });
      }
    });
  };

  reload.addEventListener('click', () => {
    handleReload();
  });

  document.addEventListener('keydown', (e) => {
    e.preventDefault();
    if (loading) return;
    if (e.key === ' ' && !e.repeat) {
      handleRollDice();
    }

    if (e.key === 'Escape') {
      handleReload();
    }
  });
})();
