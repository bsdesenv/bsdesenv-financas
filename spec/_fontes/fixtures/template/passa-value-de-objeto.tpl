<template>
  <li
    v-for="opcao in opcoes"
    :key="opcao.value"
    :class="{ ativo: opcao.value === escolhido }"
    @click="escolher(opcao.value)"
  >{{ opcao.label }}</li>
</template>
