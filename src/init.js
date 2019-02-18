// @flow

export default () => {
  const form = document.getElementById('add-url');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = e.target.querySelector('[name=rss-url');
    alert(url.value);
  });
};
