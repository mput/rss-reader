import validator from 'validator';
import { watch } from 'melanke-watchjs';

const chenkItput = (url, presentFeeds) => {
  if (!validator.isURL(url)) {
    return 'Not valid URL';
  }
  if (presentFeeds.find(feed => feed === url)) {
    return 'URL already exist';
  }
  return false;
};


export default () => {
  const state = {
    feeds: [],
    urlForm: {
      validness: 'unknown', // valid, invalid
      disabled: false,
      errorMsg: '',
    },
  };


  const urlFormHandler = (formElement) => {
    const urlInput = formElement.querySelector('[name="rss-url"]');
    const invalidFeedback = formElement.querySelector('.invalid-feedback');
    const submitBtn = formElement.querySelector('button[type="submit"]');

    watch(state, 'urlForm', () => {
      submitBtn.disabled = state.urlForm.disabled;
      invalidFeedback.textContent = state.urlForm.errorMsg;
      if (state.urlForm.validness === 'unknown') {
        urlInput.classList.remove('is-invalid');
        urlInput.classList.remove('is-valid');
      } else if (state.urlForm.validness === 'invalid') {
        urlInput.classList.remove('is-valid');
        urlInput.classList.add('is-invalid');
      } else if (state.urlForm.validness === 'valid') {
        urlInput.classList.add('is-valid');
        urlInput.classList.remove('is-invalid');
      }
    });

    urlInput.addEventListener('input', (e) => {
      const url = e.target.value;
      if (url === '') {
        state.urlForm.disabled = true;
        state.urlForm.validness = 'unknown';
        state.urlForm.errorMsg = '';
        return;
      }
      const error = chenkItput(url, state.feeds);
      if (error) {
        state.urlForm.disabled = true;
        state.urlForm.validness = 'invalid';
        state.urlForm.errorMsg = error;
      } else {
        state.urlForm.disabled = false;
        state.urlForm.validness = 'valid';
        state.urlForm.errorMsg = '';
      }
    });

    formElement.addEventListener('submit', (e) => {
      e.preventDefault();
      state.feeds = [...state.feeds, urlInput.value];
      console.log(urlInput.value);
      urlInput.value = '';
    });
  };

  const formElement = document.getElementById('add-url');
  urlFormHandler(formElement);
};
