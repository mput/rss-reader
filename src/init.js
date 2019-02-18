// @flow

export default () => {
  const form = document.getElementById('add-url');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
  });
};
