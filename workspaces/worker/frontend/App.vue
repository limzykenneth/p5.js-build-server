<script setup lang="ts">
import { ref, computed, reactive } from 'vue';

const versions = [
  '2.0.5',
  '2.0.4',
  '2.0.3',
  '2.0.2',
  '2.0.1'
];
const bundles = new Map([
  ['p5.js', 'p5.js'],
  ['p5.min.js', 'p5.min.js'],
  ['p5.mod.js', 'p5.js modules'],
  ['p5.custom.js', 'p5.js custom build'],
]);
const p5Modules = reactive({
  core: true,
  accessibility: true,
  friendlyErrors: true,
  data: false,
  dom: false,
  image: false,
  math: false,
  utilities: false,
  webgl: false,
  type: false,
  shape: false,
  color: false,
  io: false,
  events: false
});

const version = ref(versions[0]);
const bundle = ref('p5.js');
const singleModule = ref('core');

const moduleString = computed(() => {
  const selectedModules = Object.entries(p5Modules).reduce((acc, [name, isSelected]) => {
    if (isSelected) acc.push(name);
    return acc;
  }, []);
  return `?modules=${selectedModules.join(',')}`;
});

const toggleModule = (name: string) => {
  p5Modules[name] = !p5Modules[name];
};

const bundleURL = computed(() => {
  if (version.value && bundle.value) {
    if (bundle.value === 'p5.mod.js' && singleModule.value) {
      return `${window.location.origin}/${version.value}/p5.${singleModule.value}.js`;
    } else if (bundle.value === 'p5.custom.js') {
      return `${window.location.origin}/${version.value}/${bundle.value}${moduleString.value}`;
    } else if (bundle.value === 'p5.js' || bundle.value === 'p5.min.js') {
      return `${window.location.origin}/${version.value}/${bundle.value}`;
    }
  }
  return ''
});

const showCopyMessage = ref(false);
const copyURL = async () => {
  await navigator.clipboard.writeText(bundleURL.value);
  showCopyMessage.value = true;
};
</script>

<template>
  <div class="main-container">
  	<div class="selector-container">
      <span>Please give me URL for</span>

  		<select v-model="bundle">
        <option v-for="[value, name] in bundles" :value="value">{{ name }}</option>
      </select>

  		<span>at version</span>

      <select v-model="version">
        <option v-for="v in versions">{{ v }}</option>
  		</select>

  		<span v-if="bundle === 'p5.mod.js'">
  	    for module
  			<select v-if="bundle === 'p5.mod.js'" v-model="singleModule">
  		    <option v-for="(isSelected, name) in p5Modules">{{ name }}</option>
        </select>
  		</span>

      <span v-if="bundle === 'p5.custom.js'">
        with modules
        <button
          v-for="(isSelected, name) in p5Modules"
          class="custom-module-button"
          :class="isSelected ? 'selected' : ''"
          :disabled="['core', 'accessibility', 'friendlyErrors'].includes(name)"
          @click="toggleModule(name)"
        >{{ name }}</button>
      </span>
  	</div>

  	<div class="url-container">
      <span class="copy-url">{{ bundleURL }}</span>
      <span class="copy-icon" @click="copyURL">
        <svg
          width="18"
          height="22"
          viewBox="4 7 18 23"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M 4.054 12.141 C 4.054 11.865 4.877 11.877 5.153 11.877 L 9.073 11.953 C 9.2 11.953 8.791 22.207 9.006 23.531 C 11.73 24.182 17.631 24.022 17.631 24.171 L 17.638 28.083 C 17.638 28.359 17.414 28.583 17.138 28.583 L 4.554 28.583 C 4.278 28.583 4.054 28.359 4.054 28.083 L 4.054 12.141 Z M 5.054 12.641 L 5.054 27.583 L 16.638 27.583 L 16.735 24.024 L 8.623 24.051 L 8.195 12.679 L 5.054 12.641 Z"
            fill="currentColor"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M 8.14 8.083 C 8.14 7.807 8.364 7.583 8.64 7.583 L 21.224 7.583 C 21.5 7.583 21.724 7.807 21.724 8.083 L 21.724 24.025 C 21.724 24.301 21.5 24.525 21.224 24.525 L 8.64 24.525 C 8.364 24.525 8.14 24.301 8.14 24.025 L 8.14 8.083 Z M 9.14 8.583 L 9.14 23.525 L 20.724 23.525 L 20.724 8.583 L 9.14 8.583 Z"
            fill="currentColor"
          />
        </svg>
        <Transition @after-enter="showCopyMessage = false">
          <span v-if="showCopyMessage" class="copy-action-prompt">Copied!</span>
        </Transition>
      </span>
  	</div>
  </div>
</template>

<style scoped>
@import "./stylesheets/variables.css";

.main-container{
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  max-width: 900px;

  .selector-container{
    padding: 0.5rem;

    select, button{
      font-size: inherit;
      font-family: inherit;
    }

    select{
      appearance: none;
      background-color: transparent;
      border: 5px solid var(--bg-magenta-70);
      border-radius: 0.25em;
      padding: 0 0.4em;
      margin: 0.1em 0.4em;
      cursor: pointer;
      line-height: inherit;
      text-align: center;
    }

    .custom-module-button {
      cursor: pointer;
      background-color: transparent;
      border: 5px solid var(--bg-magenta-70);
      border-radius: 0.25em;
      margin: 0 0.1em;
      color: black;

      &.selected{
        background: var(--bg-magenta-20);
      }
    }
  }

  .url-container{
    min-height: 3.5rem;
    border: 5px solid var(--bg-magenta-70);
    border-radius: 0.25em;
    font-family: var(--font-serif);
    font-size: 0.75em;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .copy-url{
      padding: 1rem;
    }

    .copy-icon{
      display: flex;
      align-items: center;
      cursor: pointer;
      padding: 1rem;

      .copy-action-prompt{
        position: absolute;
        right: -15%;
      }
    }
  }
}

.v-enter-from{
  display: block;
  opacity: 1;
}

.v-enter-active{
  transition: opacity 1s linear;
  transition-delay: 2s;
}

.v-enter-to{
  opacity: 0;
}

.v-leave-from{
  opacity: 0;
}
</style>
