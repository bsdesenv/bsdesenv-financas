<template>
  <q-table>
    <template #body="props">
      <q-td>{{ props.row }}</q-td>
    </template>
  </q-table>
  <button @click="aberto.value = false">Cancelar</button>
</template>
