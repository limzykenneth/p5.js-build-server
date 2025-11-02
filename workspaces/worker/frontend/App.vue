<script setup lang="ts">
import { ref, computed, reactive } from 'vue';

const version = ref(null);
const bundle = ref(null);
const singleModule = ref(null);
const p5Modules = reactive({
  core: true,
  shape: false,
  color: false,
  io: false,
  events: false
});

const moduleString = computed(() => {
  const selectedModules = Object.entries(p5Modules).reduce((acc, [name, isSelected]) => {
    if (isSelected) acc.push(name);
    return acc;
  }, []);
  return `?modules=${selectedModules.join(",")}`;
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
  return ""
});
</script>

<template>
	<div>
	    <span>Please give me URL for</span>

		<select v-model="bundle">
           	<option value="p5.js">p5.js</option>
            <option value="p5.min.js">p5.min.js</option>
            <option value="p5.mod.js">p5.js modules</option>
            <option value="p5.custom.js">p5.js custom build</option>
	    </select>

		<span>at version</span>

	    <select v-model="version">
			<option>2.0.5</option>
			<option>2.0.4</option>
			<option>2.0.3</option>
			<option>2.0.2</option>
			<option>2.0.1</option>
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
                :disabled="['core'].includes(name)"
                @click="toggleModule(name)"
            >{{ name }}</button>
        </span>
	</div>

	<div>
	    {{ bundleURL }}
	</div>
</template>

<style scoped>
.custom-module-button {
    &.selected{
        background: green;
    }
}
</style>
