const selects = document.querySelectorAll('.filter-options select');
    selects.forEach((select) => {
      const options = select.querySelectorAll('option');
      let maxWidth = 0;
      options.forEach((option) => {
        maxWidth = Math.max(maxWidth, option.offsetWidth);
      });
      select.style.width = '${maxWidth}px';
    });