# !/usr/bin/env python
import json
import pandas as pd
import processing_text
import classify_model
import processing_output

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import paho.mqtt.client as paho
import time

# maqiatto broker information config
BROKER = 'www.maqiatto.com'
PORT = 1883
TOPIC_QUES = 'ductrantrung.hust@gmail.com/question'
TOPIC_REPLY = 'ductrantrung.hust@gmail.com/reply'
USERNAME = 'ductrantrung.hust@gmail.com'
PASSWORD = '03021999'


# File data
DATASET = 'data/dataset_collections.csv'
num_class = 9

table = pd.read_csv(DATASET)
labels = table['class'].values
texts = table['text'].values

# pre-processing text
text_data = processing_text.clean_text(texts)

# rename label into text
label_data=[]
for label in labels:
    label_data.append('_label_' + str(label))


# build model for the first time and save model to use
def trying_build_model(test_percent):
    # split data to training data and test data  # = 0.1

    X_train, X_test, y_train, y_test = train_test_split(text_data, label_data, test_size=test_percent, random_state=42)

    # encode label
    label_encoder = LabelEncoder()
    label_encoder.fit(y_train)

    y_train = label_encoder.transform(y_train)
    y_test = label_encoder.transform(y_test)

    # build model using svm
    classify_model.build_and_run_svm(X_train, y_train)

    # test model
    classify_model.test_model(X_test, y_test)

    return classify_model


# publish function, after classify, send the reply to topic reply
def publish_message(message):
    print('message send: ' + message)
    data = {"payload": message}
    data_json = json.dumps(data)
    client = paho.Client()

    client.username_pw_set(USERNAME, PASSWORD)
    client.connect(BROKER, PORT, 60)
    client.publish(TOPIC_REPLY, data_json)
    client.disconnect()


# process message which received from topic question
def process_message(message):
    input_text = [message]
    input_text = processing_text.clean_text(input_text)

    output = classify_model.test_model_user(input_text)

    publish_message(processing_output.label_to_text(output[0]))


if __name__ == "__main__":
    # test model with the text input from user
    # classify_model = trying_build_model(0.1)
    # call back
    def on_connect(client, userdata, flags, rc):
        if rc == 0:
            print('client is connected')
            client.subscribe(TOPIC_QUES)

        else:
            print('Connected failed')

    # call back for subscribe function
    def on_message(client, userdata, message):
        data = json.loads(message.payload)
        print('message received: '+ data['payload'])
        process_message(data['payload'])

    client = paho.Client()

    client.username_pw_set(USERNAME, PASSWORD)
    client.connect(BROKER, PORT, 60)
    client.on_connect = on_connect
    client.on_message = on_message
    client.loop_forever()